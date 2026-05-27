// 密码配置
const PASSWORD = "2006";

// 数据初始化
let files = JSON.parse(localStorage.getItem('cloudFiles')) || [];
let groups = JSON.parse(localStorage.getItem('cloudGroups')) || [
  { id: 'default', name: '默认分组' },
  { id: 'image', name: '图片' },
  { id: 'video', name: '视频' }
];

let currentGroup = 'all';
const maxStorage = 20 * 1024 * 1024 * 1024; // 20GB

// DOM 元素
const loginBox = document.getElementById('loginBox');
const mainBox = document.getElementById('mainBox');
const pwdInput = document.getElementById('pwdInput');
const loginBtn = document.getElementById('loginBtn');

const filesGrid = document.getElementById('filesGrid');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const searchInput = document.getElementById('searchInput');
const storageProgress = document.getElementById('storageProgress');
const storageText = document.getElementById('storageText');
const groupList = document.getElementById('groupList');
const addGroupBtn = document.getElementById('addGroupBtn');
const currentGroupTitle = document.getElementById('currentGroupTitle');

// 密码登录事件
loginBtn.addEventListener('click', checkPwd);
pwdInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') checkPwd();
});

// 校验密码
function checkPwd(){
  if(pwdInput.value.trim() === PASSWORD){
    loginBox.style.display = 'none';
    mainBox.style.display = 'flex';
    // 登录成功后初始化云盘
    initCloudDisk();
  }else{
    alert('密码错误，请重新输入！');
    pwdInput.value = '';
    pwdInput.focus();
  }
}

// 初始化云盘所有功能
function initCloudDisk(){
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleUpload);
  addGroupBtn.addEventListener('click', createGroup);
  searchInput.addEventListener('input', () => {
    renderGroups();
    renderFiles();
  });

  renderGroups();
  renderFiles();
  updateStorage();
}

// ========== 文件上传 ==========
function handleUpload(e) {
  const selectedFiles = Array.from(e.target.files);
  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      files.push({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        url: ev.target.result,
        group: currentGroup === 'all' ? 'default' : currentGroup,
        time: new Date().toLocaleString()
      });
      saveAll();
      renderGroups();
      renderFiles();
      updateStorage();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

// ========== 渲染文件列表 ==========
function renderFiles() {
  filesGrid.innerHTML = '';
  let list = files;

  if (currentGroup !== 'all') {
    list = files.filter(f => f.group === currentGroup);
  }
  const keyword = searchInput.value.toLowerCase();
  if (keyword) list = list.filter(f => f.name.toLowerCase().includes(keyword));

  list.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';
    let groupOptions = '';
    groups.forEach(g => {
      groupOptions += `<option value="${g.id}" ${file.group === g.id ? 'selected' : ''}>${g.name}</option>`;
    });

    card.innerHTML = `
      <div class="file-icon"><i class="fas fa-file"></i></div>
      <div class="file-name">${file.name}</div>
      <div class="file-meta">
        <span>${formatSize(file.size)}</span>
        <span>${file.time.slice(5,16)}</span>
      </div>
      <div class="file-actions">
        <button onclick="downloadFile(${file.id})">下载</button>
        <button onclick="renameFile(${file.id})">重命名</button>
        <button onclick="deleteFile(${file.id})">删除</button>
        <select onchange="moveFile(${file.id},this.value)">
          <option value="">移动到</option>
          ${groupOptions}
        </select>
      </div>
    `;
    filesGrid.appendChild(card);
  });
}

// ========== 文件操作 ==========
function downloadFile(id) {
  const f = files.find(x => x.id === id);
  const a = document.createElement('a');
  a.href = f.url;
  a.download = f.name;
  a.click();
}

function renameFile(id) {
  const f = files.find(x => x.id === id);
  const newName = prompt('新文件名', f.name);
  if (newName) {
    f.name = newName;
    saveAll();
    renderGroups();
    renderFiles();
  }
}

function deleteFile(id) {
  if (!confirm('确定删除该文件？')) return;
  files = files.filter(x => x.id !== id);
  saveAll();
  renderGroups();
  renderFiles();
  updateStorage();
}

function moveFile(fileId, groupId) {
  if (!groupId) return;
  const f = files.find(x => x.id === fileId);
  f.group = groupId;
  saveAll();
  renderGroups();
  renderFiles();
}

// ========== 分组管理 ==========
function createGroup() {
  const name = prompt('请输入分组名称');
  if (!name || name.trim() === '') return;
  groups.push({ id: 'g' + Date.now(), name: name.trim() });
  saveAll();
  renderGroups();
}

function renderGroups() {
  groupList.innerHTML = '';
  groups.forEach(g => {
    const count = files.filter(f => f.group === g.id).length;
    const li = document.createElement('li');
    li.className = 'group-item' + (g.id === currentGroup ? ' active' : '');
    li.innerHTML = `
      <span class="group-name" onclick="switchGroup('${g.id}')">${g.name}</span>
      <span class="group-count">(${count})</span>
      <div class="group-ops">
        <span class="group-rename" onclick="renameGroup('${g.id}')" title="重命名"><i class="fas fa-edit"></i></span>
        <span class="group-delete" onclick="deleteGroup('${g.id}')" title="删除"><i class="fas fa-times"></i></span>
      </div>
    `;
    groupList.appendChild(li);
  });
}

function switchGroup(id) {
  currentGroup = id;
  const name = id === 'all' ? '所有文件' : (groups.find(g => g.id === id)?.name || '未知分组');
  currentGroupTitle.innerHTML = `<i class="fas fa-folder-open neon-text"></i> ${name}`;
  renderGroups();
  renderFiles();
}

function renameGroup(id) {
  const g = groups.find(x => x.id === id);
  const newName = prompt('修改分组名称', g.name);
  if (newName && newName.trim() !== '') {
    g.name = newName.trim();
    saveAll();
    renderGroups();
  }
}

function deleteGroup(id) {
  if (!confirm('删除分组会一并删除组内所有文件，确定继续？')) return;
  groups = groups.filter(g => g.id !== id);
  files = files.filter(f => f.group !== id);
  saveAll();
  switchGroup('all');
  updateStorage();
}

// ========== 数据持久化 & 工具方法 ==========
function saveAll() {
  localStorage.setItem('cloudFiles', JSON.stringify(files));
  localStorage.setItem('cloudGroups', JSON.stringify(groups));
}

function updateStorage() {
  const used = files.reduce((t, f) => t + f.size, 0);
  const percent = Math.min(used / maxStorage * 100, 100);
  storageProgress.style.width = percent + '%';
  storageText.innerText = `${formatSize(used)} / 20GB`;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + 'GB';
}