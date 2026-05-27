// ===================== 云端版配置 =====================
const PASSWORD = "2006";
let files = [];
let groups = [{ id: "default", name: "默认分组" }];
let currentGroup = "all";

// DOM
const loginWrapper = document.getElementById("loginWrapper");
const mainContainer = document.getElementById("mainContainer");
const fileList = document.getElementById("fileList");
const groupList = document.getElementById("groupList");
const progressBar = document.getElementById("progressBar");
const storageText = document.getElementById("storageText");
const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("search");
const dropArea = document.getElementById("dropArea");
const previewModal = document.getElementById("previewModal");
const previewImg = document.getElementById("previewImg");

// ===================== 登录 =====================
async function login() {
  const p = document.getElementById("pwd").value;
  if (p === PASSWORD) {
    loginWrapper.style.display = "none";
    mainContainer.style.display = "flex";
    await loadFromCloud();
    init();
  } else {
    alert("密码错误");
  }
}

// ===================== 初始化 =====================
function init() {
  fileInput.addEventListener("change", uploadFiles);
  searchInput.addEventListener("input", renderFiles);
  bindDragEvent();
  renderGroups();
  renderFiles();
  updateStorage();
}

// ===================== 从云端加载数据 =====================
async function loadFromCloud() {
  try {
    files = await puter.fs.read('/files.json').then(JSON.parse);
  } catch (e) { files = []; }

  try {
    groups = await puter.fs.read('/groups.json').then(JSON.parse);
  } catch (e) {
    groups = [{ id: "default", name: "默认分组" }];
  }
}

// ===================== 保存到云端 =====================
async function saveAll() {
  await puter.fs.write('/files.json', JSON.stringify(files));
  await puter.fs.write('/groups.json', JSON.stringify(groups));
}

// ===================== 拖拽上传 =====================
function bindDragEvent() {
  ["dragenter", "dragover", "dragleave", "drop"].forEach(e => {
    dropArea.addEventListener(e, ev => ev.preventDefault());
  });
  ["dragenter", "dragover"].forEach(e => {
    dropArea.addEventListener(e, () => dropArea.classList.add("active"));
  });
  ["dragleave", "drop"].forEach(e => {
    dropArea.addEventListener(e, () => dropArea.classList.remove("active"));
  });
  dropArea.addEventListener("drop", async e => {
    const arr = Array.from(e.dataTransfer.files);
    await handleUpload(arr);
  });
}

// ===================== 上传到云端 =====================
async function handleUpload(fileArr) {
  for (const file of fileArr) {
    const path = `/uploads/${file.name}`;
    await puter.fs.write(path, file);
    const url = await puter.fs.getUrl(path);

    files.push({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      url: url,
      group: currentGroup === "all" ? "default" : currentGroup,
      type: file.type
    });
  }
  await saveAll();
  renderFiles();
  updateStorage();
}

async function uploadFiles(e) {
  const arr = Array.from(e.target.files);
  await handleUpload(arr);
  e.target.value = "";
}

// ===================== 分组 =====================
function createGroup() {
  const name = prompt("分组名称");
  if (!name) return;
  groups.push({ id: "g" + Date.now(), name });
  saveAll();
  renderGroups();
}

function renderGroups() {
  groupList.innerHTML = `
    <li class="${currentGroup === 'all' ? 'active' : ''}" onclick="switchGroup('all')">所有文件</li>
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

function switchGroup(id) {
  currentGroup = id;
  renderGroups();
  renderFiles();
}

function renameGroup(id) {
  const g = groups.find(x => x.id === id);
  const newName = prompt("新名称", g.name);
  if (newName) {
    g.name = newName;
    saveAll();
    renderGroups();
  }
}

async function deleteGroup(id) {
  if (!confirm("删除分组将删除组内所有文件！")) return;
  groups = groups.filter(x => x.id !== id);
  files = files.filter(x => x.group !== id);
  await saveAll();
  switchGroup("all");
}

// ===================== 渲染文件 =====================
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
    const isImg = f.type.startsWith("image/");
    const icon = isImg
      ? `<i class="fas fa-image" onclick="openPreview('${f.url}')"></i>`
      : `<i class="fas fa-file"></i>`;

    div.innerHTML = `
      <div class="file-icon">${icon}</div>
      <div class="file-name">${f.name}</div>
      <div class="file-size">${formatSize(f.size)}</div>
      <div class="file-actions">
        <button onclick="download('${f.url}','${f.name}')">下载</button>
        <button onclick="remove(${f.id})">删除</button>
        <button onclick="move(${f.id})">移动</button>
      </div>
    `;
    fileList.appendChild(div);
  });
}

// ===================== 预览 =====================
function openPreview(url) {
  previewImg.src = url;
  previewModal.style.display = "flex";
}
function closePreview() {
  previewModal.style.display = "none";
}

// ===================== 下载 =====================
function download(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.target = "_blank";
  a.click();
}

// ===================== 删除 =====================
async function remove(id) {
  if (!confirm("确定删除？")) return;
  files = files.filter(x => x.id !== id);
  await saveAll();
  renderFiles();
  updateStorage();
}

// ===================== 移动 =====================
function move(id) {
  let select = `<select onchange="changeGroup(${id},this.value)">`;
  groups.forEach(g => {
    select += `<option value="${g.id}">${g.name}</option>`;
  });
  select += `</select>`;
  const temp = document.createElement("div");
  temp.innerHTML = select;
  temp.firstChild.click();
}

async function changeGroup(fileId, groupId) {
  const f = files.find(x => x.id === fileId);
  f.group = groupId;
  await saveAll();
  renderFiles();
}

// ===================== 存储计算 =====================
function updateStorage() {
  const total = files.reduce((s, f) => s + f.size, 0);
  storageText.innerText = `${formatSize(total)} / 云端无限`;
}

function formatSize(b) {
  if (b < 1024) return b + "B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + "KB";
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + "MB";
  return (b / 1024 / 1024 / 1024).toFixed(2) + "GB";
}
