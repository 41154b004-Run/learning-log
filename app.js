/**
 * 我的學習紀錄 (My Learning Records) - 主邏輯腳本
 * 嚴格規範：
 * 1. 僅使用純原生 JavaScript 與 Supabase JS SDK v2
 * 2. 所有使用者文字均透過 textContent 輸出，防止 XSS 攻擊
 * 3. 搭配 Supabase RLS，僅能讀取與刪除自身資料
 */

// 確保 Supabase SDK 與設定檔已正確載入
let supabaseClient = null;
let currentUser = null;

// DOM 元素快取
const dom = {
  // 導覽列與通知
  globalMessage: document.getElementById('global-message'),
  userControls: document.getElementById('user-controls'),
  userEmailDisplay: document.getElementById('user-email-display'),
  btnLogout: document.getElementById('btn-logout'),

  // 區塊切換
  authSection: document.getElementById('auth-section'),
  dashboardSection: document.getElementById('dashboard-section'),

  // 驗證表單
  tabLogin: document.getElementById('tab-login'),
  tabRegister: document.getElementById('tab-register'),
  authForm: document.getElementById('auth-form'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),

  // 學習紀錄表單
  recordForm: document.getElementById('record-form'),
  recordDate: document.getElementById('record-date'),
  recordDuration: document.getElementById('record-duration'),
  recordContent: document.getElementById('record-content'),
  recordObstacles: document.getElementById('record-obstacles'),
  btnSaveRecord: document.getElementById('btn-save-record'),

  // 紀錄列表容器
  recordsList: document.getElementById('records-list'),
  recordsLoading: document.getElementById('records-loading'),
  recordsEmpty: document.getElementById('records-empty'),
  recordsCount: document.getElementById('records-count'),

  // 近 7 天統計
  stat7DaysMinutes: document.getElementById('stat-7days-minutes'),
  stat7DaysCount: document.getElementById('stat-7days-count')
};

// 驗證狀態模式：'login' | 'register'
let authMode = 'login';

// ==========================================
// 1. 初始化應用程式
// ==========================================
function initApp() {
  // 檢查 Supabase SDK
  if (typeof window.supabase === 'undefined') {
    showMessage('無法載入 Supabase SDK，請檢查網路連線或 CDN 設定。', 'error', 0);
    return;
  }

  // 取得設定值
  const url = window.SUPABASE_CONFIG?.url || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '');
  const anonKey = window.SUPABASE_CONFIG?.anonKey || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');

  if (!url || !anonKey || url.includes('paste_') || anonKey.includes('paste_')) {
    showMessage('請先於 config.js 設定您的 Supabase Project URL 與 Publishable Key！', 'error', 0);
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, anonKey);
  } catch (err) {
    showMessage('初始化 Supabase 連線失敗：' + err.message, 'error', 0);
    return;
  }

  // 綁定所有事件監聽器
  bindEvents();

  // 設定日期預設值為今日 (YYYY-MM-DD)
  setTodayDate();

  // 檢查目前登入狀態
  checkInitialSession();
}

// 設定日期欄位預設為今日
function setTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dom.recordDate.value = `${yyyy}-${mm}-${dd}`;
}

// ==========================================
// 2. 身分驗證 (Auth) 邏輯
// ==========================================
async function checkInitialSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.warn('取得 Session 失敗：', error.message);
    }
    handleAuthChange(session?.user || null);

    // 監聽後續登入/登出狀態異動
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user || null);
    });
  } catch (err) {
    console.error('Session 檢查例外：', err);
  }
}

// 根據登入狀態切換畫面
function handleAuthChange(user) {
  currentUser = user;

  if (currentUser) {
    // 已登入
    dom.authSection.classList.add('hidden');
    dom.dashboardSection.classList.remove('hidden');
    dom.userControls.classList.remove('hidden');
    dom.userEmailDisplay.textContent = currentUser.email || '已登入會員';
    // 載入該使用者的學習紀錄
    loadLearningLogs();
  } else {
    // 未登入 / 已登出
    dom.authSection.classList.remove('hidden');
    dom.dashboardSection.classList.add('hidden');
    dom.userControls.classList.add('hidden');
    dom.userEmailDisplay.textContent = '';
    dom.recordsList.innerHTML = '';
    update7DaysStats([]);
  }
}

// 切換登入 / 註冊 Tab
function switchAuthMode(mode) {
  authMode = mode;
  if (mode === 'login') {
    dom.tabLogin.classList.add('active');
    dom.tabRegister.classList.remove('active');
    dom.authSubmitBtn.textContent = '立即登入';
  } else {
    dom.tabRegister.classList.add('active');
    dom.tabLogin.classList.remove('active');
    dom.authSubmitBtn.textContent = '免費註冊帳號';
  }
  clearMessage();
}

// 處理送出登入或註冊
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;

  if (!email || !password) {
    showMessage('請填寫 Email 與密碼！', 'error');
    return;
  }

  setAuthLoading(true);
  clearMessage();

  try {
    if (authMode === 'login') {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showMessage('登入失敗：' + translateAuthError(error.message), 'error');
      } else {
        showMessage('登入成功！歡迎回來。', 'success');
        dom.authForm.reset();
      }
    } else {
      // 註冊帳號
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
      });

      if (error) {
        showMessage('註冊失敗：' + translateAuthError(error.message), 'error');
      } else {
        // 若專案開啟了 Confirm Email，Session 可能尚未建立
        if (data.user && !data.session) {
          showMessage('註冊成功！請至您的信箱點擊驗證信以啟用帳號（若未開啟驗證信則可直接切換至登入）。', 'info', 8000);
          switchAuthMode('login');
        } else {
          showMessage('註冊成功並已自動登入！', 'success');
          dom.authForm.reset();
        }
      }
    }
  } catch (err) {
    showMessage('系統錯誤：' + err.message, 'error');
  } finally {
    setAuthLoading(false);
  }
}

// 登出
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showMessage('登出失敗：' + error.message, 'error');
    } else {
      showMessage('您已安全登出。', 'info');
    }
  } catch (err) {
    showMessage('登出時發生例外：' + err.message, 'error');
  }
}

// ==========================================
// 3. 學習紀錄 CRUD (新增、查詢、刪除)
// ==========================================

// 讀取當前使用者的所有紀錄 (最新在最上面)
async function loadLearningLogs() {
  if (!currentUser) return;

  dom.recordsLoading.classList.remove('hidden');
  dom.recordsEmpty.classList.add('hidden');
  dom.recordsList.innerHTML = '';

  try {
    const { data, error } = await supabaseClient
      .from('learning_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showMessage('載入紀錄失敗：' + error.message, 'error');
      return;
    }

    renderRecords(data || []);
  } catch (err) {
    showMessage('載入紀錄時發生未知錯誤：' + err.message, 'error');
  } finally {
    dom.recordsLoading.classList.add('hidden');
  }
}

// 渲染學習紀錄列表 (嚴格採用 textContent 安全輸出，杜絕 XSS)
function renderRecords(records) {
  dom.recordsList.innerHTML = '';
  dom.recordsCount.textContent = `共 ${records.length} 筆`;

  // 更新近 7 天統計
  update7DaysStats(records);

  if (records.length === 0) {
    dom.recordsEmpty.classList.remove('hidden');
    return;
  }

  dom.recordsEmpty.classList.add('hidden');

  records.forEach(item => {
    // 兼容量測欄位名稱 (支援 log_date / learning_date, topic / content, minutes / duration_minutes, note / obstacles)
    const dateVal = item.log_date || item.learning_date || (item.created_at ? item.created_at.split('T')[0] : '');
    const topicVal = item.topic || item.content || '';
    const minutesVal = item.minutes ?? item.duration_minutes ?? 0;
    const noteVal = item.note || item.obstacles || '';

    // 建立卡片外框
    const card = document.createElement('div');
    card.className = 'record-card';
    card.setAttribute('data-id', item.id);

    // 卡片頂部資訊列 (日期、時長、刪除按鈕)
    const cardTop = document.createElement('div');
    cardTop.className = 'record-card-top';

    const metaBox = document.createElement('div');
    metaBox.className = 'record-meta';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'record-date';
    dateSpan.textContent = `📅 ${dateVal}`;

    const durationSpan = document.createElement('span');
    durationSpan.className = 'record-duration';
    durationSpan.textContent = `⏱️ ${minutesVal} 分鐘`;

    metaBox.appendChild(dateSpan);
    metaBox.appendChild(durationSpan);

    // 刪除按鈕
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline-danger btn-sm';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '刪除';
    deleteBtn.addEventListener('click', () => handleDeleteRecord(item.id));

    cardTop.appendChild(metaBox);
    cardTop.appendChild(deleteBtn);
    card.appendChild(cardTop);

    // 卡片主體內容 (學習內容)
    const bodyBox = document.createElement('div');
    bodyBox.className = 'record-body';

    const contentText = document.createElement('p');
    contentText.className = 'record-content-text';
    // 純文字賦值
    contentText.textContent = topicVal;
    bodyBox.appendChild(contentText);

    // 卡點 / 筆記 (若有填寫才顯示)
    if (noteVal && noteVal.trim()) {
      const obstacleBox = document.createElement('div');
      obstacleBox.className = 'record-obstacle-box';

      const obstacleTitle = document.createElement('div');
      obstacleTitle.className = 'record-obstacle-title';
      obstacleTitle.textContent = '💡 遇到的卡點 / 筆記：';

      const obstacleText = document.createElement('p');
      obstacleText.className = 'record-obstacle-text';
      // 純文字賦值
      obstacleText.textContent = noteVal;

      obstacleBox.appendChild(obstacleTitle);
      obstacleBox.appendChild(obstacleText);
      bodyBox.appendChild(obstacleBox);
    }

    card.appendChild(bodyBox);
    dom.recordsList.appendChild(card);
  });
}

// 新增學習紀錄
async function handleRecordSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showMessage('請先登入後再新增紀錄！', 'error');
    return;
  }

  const date = dom.recordDate.value;
  const duration = parseInt(dom.recordDuration.value, 10);
  const content = dom.recordContent.value.trim();
  const obstacles = dom.recordObstacles.value.trim();

  if (!date || !duration || duration <= 0 || !content) {
    showMessage('請確認必填欄位（日期、時間需大於 0 分鐘、今日學習內容）皆已正確填寫！', 'error');
    return;
  }

  setRecordSubmitting(true);

  try {
    // 優先使用 Supabase 現有資料庫欄位 (log_date, topic, minutes, note)
    const payloadPrimary = {
      user_id: currentUser.id,
      log_date: date,
      topic: content,
      minutes: duration,
      note: obstacles || null
    };

    let { data, error } = await supabaseClient
      .from('learning_logs')
      .insert([payloadPrimary])
      .select();

    // 若因欄位名稱不同 (PGRST204) 失敗，自動嘗試備用欄位名
    if (error && error.code === 'PGRST204') {
      const payloadFallback = {
        user_id: currentUser.id,
        learning_date: date,
        content: content,
        duration_minutes: duration,
        obstacles: obstacles || null
      };
      const fallbackResult = await supabaseClient
        .from('learning_logs')
        .insert([payloadFallback])
        .select();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      showMessage('儲存紀錄失敗：' + error.message, 'error');
    } else {
      showMessage('🎉 學習紀錄已成功新增！', 'success');
      // 重設表單，但保留今天的日期
      dom.recordContent.value = '';
      dom.recordObstacles.value = '';
      dom.recordDuration.value = '';
      setTodayDate();

      // 重新載入清單 (最新一筆將排在最上方)
      await loadLearningLogs();
    }
  } catch (err) {
    showMessage('送出紀錄時發生例外：' + err.message, 'error');
  } finally {
    setRecordSubmitting(false);
  }
}

// 刪除指定的學習紀錄
async function handleDeleteRecord(recordId) {
  const confirmDelete = window.confirm('確定要刪除這筆學習紀錄嗎？刪除後無法還原。');
  if (!confirmDelete) return;

  try {
    const { error } = await supabaseClient
      .from('learning_logs')
      .delete()
      .eq('id', recordId);

    if (error) {
      showMessage('刪除失敗：' + error.message, 'error');
    } else {
      showMessage('紀錄已成功刪除。', 'info');
      // 重新載入清單與近 7 天統計
      await loadLearningLogs();
    }
  } catch (err) {
    showMessage('刪除時發生未知錯誤：' + err.message, 'error');
  }
}

// 計算並更新近 7 天統計數據 (以日期欄位為準：今日與前 6 天；未填分鐘數以 0 計算)
function update7DaysStats(records) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 6 天前的起始日期物件 (共涵蓋今日 + 前 6 天 = 7 天)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const formatDateStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateStr(today);
  const sevenDaysAgoStr = formatDateStr(sevenDaysAgo);

  let totalMinutes = 0;
  let totalEntries = 0;

  if (Array.isArray(records)) {
    records.forEach(item => {
      const rawDate = item.log_date || item.learning_date || (item.created_at ? item.created_at.split('T')[0] : '');
      if (!rawDate) return;
      const dateStr = rawDate.slice(0, 10);

      // 判斷是否落在此 7 天區間 (包含今天與前 6 天)
      if (dateStr >= sevenDaysAgoStr && dateStr <= todayStr) {
        totalEntries += 1;
        // 未填寫或無效分鐘數以 0 計算
        const mins = Number(item.minutes ?? item.duration_minutes) || 0;
        totalMinutes += (mins > 0 ? mins : 0);
      }
    });
  }

  if (dom.stat7DaysMinutes) {
    dom.stat7DaysMinutes.textContent = `${totalMinutes} 分鐘`;
  }
  if (dom.stat7DaysCount) {
    dom.stat7DaysCount.textContent = `${totalEntries} 次`;
  }
}

// ==========================================
// 4. 輔助函數 (狀態提示、按鈕 Disable、錯誤翻譯)
// ==========================================

function bindEvents() {
  // Tab 切換
  dom.tabLogin.addEventListener('click', () => switchAuthMode('login'));
  dom.tabRegister.addEventListener('click', () => switchAuthMode('register'));

  // 登入/註冊表單
  dom.authForm.addEventListener('submit', handleAuthSubmit);

  // 登出按鈕
  dom.btnLogout.addEventListener('click', handleLogout);

  // 新增紀錄表單
  dom.recordForm.addEventListener('submit', handleRecordSubmit);
}

function showMessage(msg, type = 'info', autoHideMs = 5000) {
  dom.globalMessage.textContent = msg;
  dom.globalMessage.className = `message-banner ${type}`;
  dom.globalMessage.classList.remove('hidden');

  if (autoHideMs > 0) {
    if (window._msgTimer) clearTimeout(window._msgTimer);
    window._msgTimer = setTimeout(() => {
      clearMessage();
    }, autoHideMs);
  }
}

function clearMessage() {
  dom.globalMessage.textContent = '';
  dom.globalMessage.classList.add('hidden');
}

function setAuthLoading(isLoading) {
  dom.authSubmitBtn.disabled = isLoading;
  dom.authSubmitBtn.textContent = isLoading ? '處理中...' : (authMode === 'login' ? '立即登入' : '免費註冊帳號');
}

function setRecordSubmitting(isSubmitting) {
  dom.btnSaveRecord.disabled = isSubmitting;
  dom.btnSaveRecord.textContent = isSubmitting ? '儲存中...' : '儲存紀錄';
}

function translateAuthError(errorMsg) {
  if (!errorMsg) return '發生錯誤，請稍後再試';
  if (errorMsg.includes('Invalid login credentials')) return '帳號或密碼錯誤，請重新檢查。';
  if (errorMsg.includes('User already registered')) return '此 Email 已被註冊過，請直接登入。';
  if (errorMsg.includes('Password should be at least')) return '密碼長度至少需 6 個字元。';
  if (errorMsg.includes('Email not confirmed')) return '此帳號的電子郵件尚未經過驗證，請至信箱點擊確認信。';
  return errorMsg;
}

// 頁面載入完成後啟動
document.addEventListener('DOMContentLoaded', initApp);
