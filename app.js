// 刮痧工作室预约仪表盘
const STORAGE_KEY = 'guasha_appointments';

let appointments = [];

// 加载数据
function loadAppointments() {
  const data = localStorage.getItem(STORAGE_KEY);
  appointments = data ? JSON.parse(data) : [];
  renderAll();
}

// 保存数据
function saveAppointments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 格式化日期时间显示
function formatDateTime(dateStr, timeStr) {
  const date = new Date(dateStr + 'T' + timeStr);
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 ${weekday} ${timeStr}`;
}

function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function isUpcoming(dateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const apptDate = new Date(dateStr);
  const diffDays = (apptDate - today) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

// 渲染列表
function renderList(containerId, list, emptyText) {
  const container = document.getElementById(containerId);
  if (list.length === 0) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  container.innerHTML = list.map(appt => `
    <div class="appointment-card ${isToday(appt.date) ? 'today' : ''}">
      <div class="appointment-info">
        <h3>${appt.name}</h3>
        <p>📅 ${formatDateTime(appt.date, appt.time)}</p>
        <p>📞 ${appt.phone || '未填电话'}</p>
        <p>💼 ${appt.service}${appt.notes ? ' · ' + appt.notes : ''}</p>
      </div>
      <div class="appointment-actions">
        <button class="btn-small" onclick="editAppointment('${appt.id}')">修改</button>
        <button class="btn-small danger" onclick="deleteAppointment('${appt.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function renderAll() {
  const today = new Date().toISOString().split('T')[0];
  const todayList = appointments
    .filter(a => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const upcomingList = appointments
    .filter(a => isUpcoming(a.date) && a.date !== today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const allList = [...appointments].sort((a, b) => 
    b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
  );

  renderList('today-list', todayList, '今天暂无预约');
  renderList('upcoming-list', upcomingList, '未来7天暂无预约');
  renderList('all-list', allList, '暂无任何预约记录');
}

// 打开添加弹窗
function openAddModal() {
  document.getElementById('modal-title').textContent = '添加预约';
  document.getElementById('edit-id').value = '';
  document.getElementById('appointment-form').reset();
  // 默认今天
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal').classList.remove('hidden');
}

// 编辑
function editAppointment(id) {
  const appt = appointments.find(a => a.id === id);
  if (!appt) return;

  document.getElementById('modal-title').textContent = '修改预约';
  document.getElementById('edit-id').value = id;
  document.getElementById('name').value = appt.name;
  document.getElementById('phone').value = appt.phone || '';
  document.getElementById('date').value = appt.date;
  document.getElementById('time').value = appt.time;
  document.getElementById('service').value = appt.service;
  document.getElementById('notes').value = appt.notes || '';
  document.getElementById('modal').classList.remove('hidden');
}

// 删除
function deleteAppointment(id) {
  if (confirm('确定要删除这个预约吗？')) {
    appointments = appointments.filter(a => a.id !== id);
    saveAppointments();
    renderAll();
  }
}

// 保存表单后自动提示添加到日历
document.getElementById('appointment-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const appointment = {
    id: id || generateId(),
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    service: document.getElementById('service').value,
    notes: document.getElementById('notes').value.trim(),
    createdAt: id ? (appointments.find(a => a.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (id) {
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }

  saveAppointments();
  renderAll();
  document.getElementById('modal').classList.add('hidden');

  // 保存成功后提示添加到日历
  setTimeout(() => {
    if (confirm('预约已保存！\n\n是否立即添加到手机日历（会自动提醒）？')) {
      addToCalendar(appointment);
    }
  }, 300);
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

document.getElementById('add-btn').addEventListener('click', openAddModal);

// 生成并下载/打开 .ics 日历文件（iPhone会直接打开日历）
function addToCalendar(appt) {
  const start = new Date(appt.date + 'T' + appt.time);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 默认1小时

  const formatICS = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Guasha Studio//CN
BEGIN:VEVENT
UID:${appt.id}@guasha
DTSTAMP:${formatICS(new Date())}
DTSTART:${formatICS(start)}
DTEND:${formatICS(end)}
SUMMARY:${appt.name} - ${appt.service}
DESCRIPTION:电话：${appt.phone || '无'}\\n备注：${appt.notes || '无'}
BEGIN:VALARM
TRIGGER:-PT30M
DESCRIPTION:预约提醒
ACTION:DISPLAY
END:VALARM
BEGIN:VALARM
TRIGGER:-PT10M
DESCRIPTION:即将开始
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `刮痧预约_${appt.name}_${appt.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('已生成日历文件。\n\n在iPhone上会自动打开日历，点右上角「添加」即可，提醒已设置（提前30分钟和10分钟）。');
}

// 批量添加今日或选中到日历（可选按钮）
document.getElementById('calendar-btn').addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  const todayList = appointments.filter(a => a.date === today);
  if (todayList.length === 0) {
    alert('今天暂无预约可添加');
    return;
  }
  if (confirm(`是否把今天的 ${todayList.length} 个预约都添加到日历？`)) {
    todayList.forEach((appt, i) => {
      setTimeout(() => addToCalendar(appt), i * 800);
    });
  }
});

// 导出今日名单（复制到剪贴板）
document.getElementById('export-btn').addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  const todayList = appointments
    .filter(a => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todayList.length === 0) {
    alert('今天暂无预约');
    return;
  }

  const text = todayList.map((a, i) => 
    `${i + 1}. ${a.time} ${a.name} ${a.phone || ''} ${a.service}${a.notes ? ' (' + a.notes + ')' : ''}`
  ).join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert('今日预约名单已复制！\n可以直接粘贴到微信发给客人。');
    }).catch(() => {
      showCopyFallback(text);
    });
  } else {
    showCopyFallback(text);
  }
});

function showCopyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    alert('已复制到剪贴板');
  } catch (e) {
    prompt('请手动复制下面内容：', text);
  }
  document.body.removeChild(ta);
}

// 初始化
loadAppointments();