// 刮痧工作室预约仪表盘（带 iPhone 风格日历）
const STORAGE_KEY = 'guasha_appointments';

let appointments = [];
let currentDate = new Date();
let selectedDate = new Date().toISOString().split('T')[0];

// 加载数据（保持原有 key，数据不会丢失）
function loadAppointments() {
  const data = localStorage.getItem(STORAGE_KEY);
  appointments = data ? JSON.parse(data) : [];
  renderCalendar();
  renderSelectedDay();
}

// 保存数据
function saveAppointments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0];
}

// 渲染日历
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  document.getElementById('current-month').textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // 上个月的空白天
  for (let i = 0; i < startDay; i++) {
    const prev = new Date(year, month, -startDay + i + 1);
    grid.appendChild(createDayElement(prev, true));
  }

  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    grid.appendChild(createDayElement(date, false));
  }

  // 下个月补齐
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    const next = new Date(year, month + 1, i);
    grid.appendChild(createDayElement(next, true));
  }
}

function createDayElement(date, otherMonth) {
  const div = document.createElement('div');
  const dateStr = formatDate(date);
  div.className = 'day';
  if (otherMonth) div.classList.add('other-month');
  if (isToday(dateStr)) div.classList.add('today');
  if (dateStr === selectedDate) div.classList.add('selected');
  if (appointments.some(a => a.date === dateStr)) div.classList.add('has-appointment');
  div.textContent = date.getDate();
  div.onclick = () => selectDate(dateStr);
  return div;
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar();
  renderSelectedDay();
}

// 渲染选中日期的预约
function renderSelectedDay() {
  const list = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const title = document.getElementById('selected-day-title');
  const container = document.getElementById('selected-day-list');

  if (isToday(selectedDate)) {
    title.textContent = '今日预约';
  } else {
    const d = new Date(selectedDate);
    title.textContent = `${d.getMonth() + 1}月${d.getDate()}日预约`;
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="empty">这天暂无预约</div>';
    return;
  }

  container.innerHTML = list.map(appt => `
    <div class="appointment-card ${isToday(appt.date) ? 'today' : ''}">
      <div class="appointment-info">
        <h3>${appt.name}</h3>
        <p>⏰ ${appt.time}</p>
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

// 月份切换
document.getElementById('prev-month').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};
document.getElementById('next-month').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

// 打开添加弹窗（默认选中日期）
function openAddModal() {
  document.getElementById('modal-title').textContent = '添加预约';
  document.getElementById('edit-id').value = '';
  document.getElementById('appointment-form').reset();
  document.getElementById('date').value = selectedDate;
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
    renderCalendar();
    renderSelectedDay();
  }
}

// 保存表单
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
  selectedDate = appointment.date;
  renderCalendar();
  renderSelectedDay();
  document.getElementById('modal').classList.add('hidden');

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

// 生成并打开 .ics
function addToCalendar(appt) {
  const start = new Date(appt.date + 'T' + appt.time);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

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

document.getElementById('calendar-btn').addEventListener('click', () => {
  const list = appointments.filter(a => a.date === selectedDate);
  if (list.length === 0) {
    alert('这天暂无预约可添加');
    return;
  }
  if (confirm(`是否把这天的 ${list.length} 个预约都添加到日历？`)) {
    list.forEach((appt, i) => {
      setTimeout(() => addToCalendar(appt), i * 800);
    });
  }
});

// 导出选中日期名单
document.getElementById('export-btn').addEventListener('click', () => {
  const list = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (list.length === 0) {
    alert('这天暂无预约');
    return;
  }

  const text = list.map((a, i) => 
    `${i + 1}. ${a.time} ${a.name} ${a.phone || ''} ${a.service}${a.notes ? ' (' + a.notes + ')' : ''}`
  ).join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert('名单已复制！可以直接粘贴到微信。');
    }).catch(() => showCopyFallback(text));
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