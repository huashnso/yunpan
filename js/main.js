const PASSWORD = "2006";
const MAX_STORAGE = 20 * 1024 * 1024 * 1024;

let files = JSON.parse(localStorage.getItem("files")) || [];
let groups = JSON.parse(localStorage.getItem("groups")) || [
  { id: "default", name: "默认分组" }
];

let currentGroup = "all";

const loginWrapper = document.getElementById("loginWrapper");
const mainContainer = document.getElementById("mainContainer");
const fileList = document.getElementById("fileList");
const groupList = document.getElementById("groupList");
const progressBar = document.getElementById("progressBar");
const storageText = document.getElementById("storageText");
const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("search");

function login() {
  const p = document.getElementById("pwd").value;
  if (p === PASSWORD) {
    loginWrapper.style.display = "none";
    mainContainer.style.display = "flex";
    init();
  } else {
    alert("密码错误");
  }
}

function init() {
  fileInput.addEventListener("change", uploadFiles);
  searchInput.addEventListener("input", renderFiles);
  renderGroups();
  renderFiles();
  updateStorage();
}

// 创建分组
function createGroup() {
  const name = prompt("分组名称");
  if (!name) return;
  groups.push({ id: "g" + Date.now(), name });
  saveGroups();
  renderGroups();
}

// 渲染分组
function renderGroups() {
  groupList.innerHTML = `
    <li class="${currentGroup === 'all' ? 'active' : ''}" onclick="switchGroup('all')">
      所有文件
    </li>
  `;
  groups.forEach(g => {
    const li = document.createElement("li");
    li.className = currentGroup === g.id ? "active" : "";
    li.innerHTML = `
      <span onclick="switchGroup('${g.id}')">${g.name}</span>
      <div class="group-actions">
        <span onclick="renameGroup('${g.id}')">编辑</span>
        <span onclick="deleteGroup('${g.id}')">×</span>
      </div>
    `;
    groupList.appendChild(li);
  });
}

// 切换分组
function switchGroup(id) {
  currentGroup = id;
  renderGroups();
  renderFiles();
}

// 重命名分组
function renameGroup(id) {
  const g = groups.find(x => x.id === id);
  const newName = prompt("新名称", g.name);
  if (newName) {
    g.name = newName;
    saveGroups();
    renderGroups();
  }
}

// 删除分组
function deleteGroup(id) {
  if (!confirm("删除分组将删除组内所有文件！")) return;
  groups = groups.filter(x => x.id !== id);
  files = files.filter(x => x.group !== id);
  saveAll();
  switchGroup("all");
}

// 上传
function uploadFiles(e) {
  const fs = Array.from(e.target.files);
  fs.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      files.push({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        url: ev.target.result,
        group: currentGroup === "all" ? "default" : currentGroup
      });
      saveAll();
      renderFiles();
      updateStorage();
    };
    reader.readAsDataURL(file);
  });
}

// 渲染文件
function renderFiles() {
  fileList.innerHTML = "";
  let list = files;
  if (currentGroup !== "all") {
    list = files.filter(f => f.group === currentGroup);
  }
  const kw = searchInput.value.toLowerCase();
  if (kw) list = list.filter(f => f.name.toLowerCase().includes(kw));

  list.forEach(f => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerHTML = `
      <div class="file-icon"><i class="fas fa-file"></i></div>
      <div class="file-name">${f.name}</div>
      <div class="file-size">${formatSize(f.size)}</div>
      <div class="file-actions">
        <button onclick="download(${f.id})">下载</button>
        <button onclick="remove(${f.id})">删除</button>
        <button onclick="move(${f.id})">移动</button>
      </div>
    `;
    fileList.appendChild(div);
  });
}

// 下载
function download(id) {
  const f = files.find(x => x.id === id);
  const a = document.createElement("a");
  a.href = f.url;
  a.download = f.name;
  a.click();
}

// 删除
function remove(id) {
  if (!confirm("确定删除？")) return;
  files = files.filter(x => x.id !== id);
  saveAll();
  renderFiles();
  updateStorage();
}

// 移动到分组
function move(id) {
  const f = files.find(x => x.id === id);
  const opts = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  const select = document.createElement("select");
  select.innerHTML = opts;
  select.onchange = () => {
    f.group = select.value;
    saveAll();
    renderFiles();
  };
  select.click();
}

// 存储
function saveAll() {
  localStorage.setItem("files", JSON.stringify(files));
  localStorage.setItem("groups", JSON.stringify(groups));
}
function saveGroups() {
  localStorage.setItem("groups", JSON.stringify(groups));
}

// 容量
function updateStorage() {
  const total = files.reduce((s, f) => s + f.size, 0);
  const per = Math.min((total / MAX_STORAGE) * 100, 100);
  progressBar.style.width = per + "%";
  storageText.innerText = `${formatSize(total)} / 20GB`;
}

function formatSize(b) {
  if (b < 1024) return b + "B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + "KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + "MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + "GB";
}
