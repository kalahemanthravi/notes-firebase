/**
 * NoteVault v3 — Block Editor, Sharing, Passwords, Delete Account
 */
import { auth, db } from "./firebase-config.js";
import {
    onAuthStateChanged, signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
    collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc, setDoc,
    onSnapshot, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
// DOM
const notesGrid = $("notesGrid"), emptyState = $("emptyState"), emptyTitle = $("emptyTitle"), emptyMsg = $("emptyMsg"),
    loadingSpinner = $("loadingSpinner"), searchInput = $("searchInput"), sortSelect = $("sortSelect"),
    viewToggle = $("viewToggle"), darkModeToggle = $("darkModeToggle"), sidebarToggle = $("sidebarToggle"),
    sidebar = $("sidebar"), sidebarOverlay = $("sidebarOverlay"), viewTitle = $("viewTitle"),
    noteCountBadge = $("noteCountBadge"), toastContainer = $("toastContainer"),
    userAvatar = $("userAvatar"), userDropdown = $("userDropdown"), userName = $("userName"),
    userEmail = $("userEmail"), userInitial = $("userInitial"), logoutBtn = $("logoutBtn"),
    fabAdd = $("fabAdd"), noteModal = $("noteModal"), modalTitle = $("modalTitle"),
    noteTitle = $("noteTitle"), noteIdInput = $("noteId"), modalClose = $("modalClose"),
    modalCancel = $("modalCancel"), saveNoteBtn = $("saveNoteBtn"),
    blocksContainer = $("blocksContainer"), blockToolbar = $("blockToolbar"), addBlockBtn = $("addBlockBtn"),
    slashMenu = $("slashMenu"), slashFilter = $("slashFilter"), slashOptions = $("slashOptions"),
    colorPickerBtn = $("colorPickerBtn"), colorPicker = $("colorPicker"),
    pinToggleBtn = $("pinToggleBtn"), lockToggleBtn = $("lockToggleBtn"),
    labelPickerBtn = $("labelPickerBtn"), labelPicker = $("labelPicker"),
    labelOptions = $("labelOptions"), newLabelInput = $("newLabelInput"), addLabelBtn = $("addLabelBtn"),
    selectedLabels = $("selectedLabels"), sidebarLabels = $("sidebarLabels"),
    previewModal = $("previewModal"), previewTitle = $("previewTitle"), previewMeta = $("previewMeta"),
    previewLabels = $("previewLabels"), previewContent = $("previewContent"), previewClose = $("previewClose"),
    previewEditBtn = $("previewEditBtn"), previewShareBtn = $("previewShareBtn"),
    previewDuplicateBtn = $("previewDuplicateBtn"), previewExportBtn = $("previewExportBtn"),
    deleteModal = $("deleteModal"), deleteMsg = $("deleteMsg"), deleteNoteIdInput = $("deleteNoteId"),
    deleteModalClose = $("deleteModalClose"), deleteCancelBtn = $("deleteCancelBtn"), confirmDeleteBtn = $("confirmDeleteBtn"), deleteTitle = $("deleteTitle"),
    shareModal = $("shareModal"), shareModalClose = $("shareModalClose"), shareNoteId = $("shareNoteId"),
    shareToggle = $("shareToggle"), sharePwToggle = $("sharePwToggle"), sharePwGroup = $("sharePwGroup"),
    sharePwInput = $("sharePwInput"), shareLinkBox = $("shareLinkBox"), shareLinkInput = $("shareLinkInput"),
    copyLinkBtn = $("copyLinkBtn"), shareOptions = $("shareOptions"), shareCloseBtn = $("shareCloseBtn"),
    passwordModal = $("passwordModal"), pwModalTitle = $("pwModalTitle"), pwModalDesc = $("pwModalDesc"),
    notePwInput = $("notePwInput"), notePwConfirm = $("notePwConfirm"), pwConfirmGroup = $("pwConfirmGroup"),
    pwCancelBtn = $("pwCancelBtn"), pwSaveBtn = $("pwSaveBtn"), pwRemoveBtn = $("pwRemoveBtn"), pwModalClose = $("pwModalClose"),
    unlockModal = $("unlockModal"), unlockPwInput = $("unlockPwInput"), unlockNoteIdEl = $("unlockNoteId"),
    unlockError = $("unlockError"), unlockCancelBtn = $("unlockCancelBtn"), unlockSubmitBtn = $("unlockSubmitBtn"), unlockModalClose = $("unlockModalClose"),
    deleteAccountBtn = $("deleteAccountBtn"), deleteAccountModal = $("deleteAccountModal"),
    delAccClose = $("delAccClose"), delAccPassword = $("delAccPassword"), delAccError = $("delAccError"),
    delAccCancel = $("delAccCancel"), delAccConfirm = $("delAccConfirm"),
    shortcutsModal = $("shortcutsModal"), shortcutsClose = $("shortcutsClose");

// State
let currentUser = null, allNotes = [], unsubscribe = null, currentFilter = "all", currentLabelFilter = null,
    currentSort = "newest", isListView = false, editColor = "default", editPinned = false, editLabels = [],
    editLocked = false, editPwHash = "", previewingNote = null, isPermanentDelete = false, slashBlockId = null;
const LABEL_COLORS = ["#6c5ce7", "#00b894", "#e17055", "#fdcb6e", "#0984e3", "#e84393", "#00cec9", "#d63031", "#636e72", "#2d3436"];
let userLabels = [];

// Block types
const BLOCK_TYPES = [
    { type: "text", icon: "¶", label: "Text", desc: "Plain paragraph" },
    { type: "h1", icon: "H1", label: "Heading 1", desc: "Large heading" },
    { type: "h2", icon: "H2", label: "Heading 2", desc: "Medium heading" },
    { type: "h3", icon: "H3", label: "Heading 3", desc: "Small heading" },
    { type: "bullet", icon: "•", label: "Bullet List", desc: "Bulleted item" },
    { type: "number", icon: "1.", label: "Numbered List", desc: "Numbered item" },
    { type: "todo", icon: "☐", label: "To-do", desc: "Checkbox item" },
    { type: "code", icon: "</>", label: "Code Block", desc: "Code with copy" },
    { type: "quote", icon: "\u201C", label: "Quote", desc: "Block quote" },
    { type: "callout", icon: "💡", label: "Callout", desc: "Highlight box" },
    { type: "divider", icon: "—", label: "Divider", desc: "Horizontal line" },
    { type: "table", icon: "▦", label: "Table", desc: "Editable table" },
    { type: "copyable", icon: "📋", label: "Copyable", desc: "Copy-ready text" },
    { type: "bookmark", icon: "🔗", label: "Bookmark", desc: "Save a link" },
];

// Helpers
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML }
function uid() { return Math.random().toString(36).slice(2, 10) }
function getTime(n) { if (!n.createdAt) return 0; if (n.createdAt instanceof Timestamp) return n.createdAt.toMillis(); if (n.createdAt.seconds) return n.createdAt.seconds * 1000; return 0 }
function fmtDate(ts) { let d; if (ts instanceof Timestamp) d = ts.toDate(); else if (ts?.seconds) d = new Date(ts.seconds * 1000); else return "Just now"; return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
function showToast(m, t = "info") { const el = document.createElement("div"); el.className = `toast ${t}`; el.textContent = m; toastContainer.appendChild(el); setTimeout(() => el.remove(), 3200) }
function setLoading(b, on) { b.classList.toggle("loading", on); b.disabled = on }
async function hashPw(p) { const e = new TextEncoder().encode(p); const h = await crypto.subtle.digest("SHA-256", e); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("") }

// Clear search input on load to prevent browser autofill from filtering notes
searchInput.value = "";

// Auth
onAuthStateChanged(auth, u => {
    if (!u) { window.location.href = "index.html"; return }
    currentUser = u; const name = u.displayName || "User";
    userName.textContent = name; userEmail.textContent = u.email; userInitial.textContent = name[0].toUpperCase();
    searchInput.value = ""; // clear autofill again after auth
    loadUserLabels(); listenToNotes();
});

// Firestore
function listenToNotes() {
    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(collection(db, "users", currentUser.uid, "notes"), snap => {
        loadingSpinner.classList.add("hidden");
        // Guard against browser autofill contaminating search
        if (searchInput.value && searchInput.value === (currentUser?.email || "")) searchInput.value = "";
        allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCounts(); renderFiltered();
    }, err => { console.error(err); loadingSpinner.classList.add("hidden"); showToast("Failed to load notes.", "error") });
}
async function createNote(data) { await addDoc(collection(db, "users", currentUser.uid, "notes"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
async function updateNote(id, data) { await updateDoc(doc(db, "users", currentUser.uid, "notes", id), { ...data, updatedAt: serverTimestamp() }) }
async function deleteNote(id) { await deleteDoc(doc(db, "users", currentUser.uid, "notes", id)) }

// Filter & Sort
function getFiltered() {
    let notes = [...allNotes];
    switch (currentFilter) {
        case "all": notes = notes.filter(n => !n.archived && !n.trashed); break;
        case "pinned": notes = notes.filter(n => n.pinned && !n.archived && !n.trashed); break;
        case "locked": notes = notes.filter(n => n.passwordHash && !n.archived && !n.trashed); break;
        case "shared": notes = notes.filter(n => n.shareId && !n.archived && !n.trashed); break;
        case "archived": notes = notes.filter(n => n.archived && !n.trashed); break;
        case "trashed": notes = notes.filter(n => n.trashed); break;
    }
    if (currentLabelFilter) notes = notes.filter(n => n.labels?.includes(currentLabelFilter));
    const q = searchInput.value.trim().toLowerCase();
    if (q) notes = notes.filter(n => (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q));
    notes.sort((a, b) => {
        if (!["pinned", "archived", "trashed"].includes(currentFilter)) { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1 }
        switch (currentSort) { case "newest": return getTime(b) - getTime(a); case "oldest": return getTime(a) - getTime(b); case "title-az": return (a.title || "").localeCompare(b.title || ""); case "title-za": return (b.title || "").localeCompare(a.title || ""); default: return 0 }
    }); return notes;
}
function renderFiltered() { const n = getFiltered(); noteCountBadge.textContent = `${n.length} note${n.length !== 1 ? "s" : ""}`; renderNotes(n) }

// Render blocks for display
function renderBlocksHTML(blocks) {
    return blocks.map(b => {
        switch (b.type) {
            case "h1": return `<h1>${b.html || esc(b.content || "")}</h1>`;
            case "h2": return `<h2>${b.html || esc(b.content || "")}</h2>`;
            case "h3": return `<h3>${b.html || esc(b.content || "")}</h3>`;
            case "bullet": return `<div style="padding-left:1.2rem">• ${b.html || esc(b.content || "")}</div>`;
            case "number": return `<div style="padding-left:1.2rem">${b.html || esc(b.content || "")}</div>`;
            case "todo": return `<div class="todo-item${b.checked ? " checked" : ""}"><input type="checkbox"${b.checked ? " checked" : ""}>${b.html || esc(b.content || "")}</div>`;
            case "code": return `<div class="code-block"><button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent);this.textContent='Copied!'">Copy</button><code>${esc(b.content || "")}</code></div>`;
            case "quote": return `<blockquote>${b.html || esc(b.content || "")}</blockquote>`;
            case "callout": return `<div class="callout-box"><span>${b.emoji || "💡"}</span><span>${b.html || esc(b.content || "")}</span></div>`;
            case "divider": return `<hr/>`;
            case "table": if (!b.rows || !b.rows.length) return ""; return `<table>${b.rows.map((r, i) => `<tr>${r.map(c => `<${i === 0 ? "th" : "td"}>${esc(c)}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>`;
            case "copyable": return `<div class="copyable-block"><button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent);this.textContent='Copied!'">Copy</button><span>${esc(b.content || "")}</span></div>`;
            case "bookmark": return `<div class="bookmark-box"><a href="${esc(b.url || "#")}" target="_blank">${esc(b.url || "")}</a>${b.content ? `<p>${esc(b.content)}</p>` : ""}</div>`;
            default: return `<p>${b.html || esc(b.content || "")}</p>`;
        }
    }).join("");
}
function parseBlocks(content) {
    if (!content) return [];
    try { const arr = JSON.parse(content); if (Array.isArray(arr) && arr.length && arr[0].type) return arr; if (Array.isArray(arr) && arr.length && arr[0].text !== undefined) return arr.map(i => ({ id: uid(), type: "todo", content: i.text, checked: i.checked })); return [{ id: uid(), type: "text", html: content }] }
    catch { return [{ id: uid(), type: "text", html: content }] }
}
function blocksPreviewHTML(blocks, max = 5) {
    const shown = blocks.slice(0, max);
    return shown.map(b => {
        if (b.type === "divider") return "<hr style='margin:.2rem 0;border-color:var(--clr-border)'>";
        if (b.type === "todo") return `<div style="display:flex;gap:.3rem;align-items:center;font-size:.82rem"><input type="checkbox" ${b.checked ? "checked" : ""} disabled style="accent-color:var(--clr-primary)">${esc((b.content || b.html || "").replace(/<[^>]*>/g, "").slice(0, 60))}</div>`;
        if (b.type === "code") return `<div style="background:rgba(0,0,0,.04);padding:.3rem .5rem;border-radius:4px;font-family:var(--font-mono);font-size:.75rem;max-height:60px;overflow:hidden">${esc((b.content || "").slice(0, 100))}</div>`;
        if (b.type === "table") return `<span style="font-size:.75rem;color:var(--clr-text-hint)">📊 Table</span>`;
        if (b.type === "bookmark") return `<div style="font-size:.78rem;color:var(--clr-primary)">🔗 ${esc((b.url || "").slice(0, 50))}</div>`;
        const txt = (b.content || b.html || "").replace(/<[^>]*>/g, "").slice(0, 80);
        if (b.type === "h1") return `<div style="font-weight:700;font-size:.92rem">${esc(txt)}</div>`;
        if (b.type === "h2") return `<div style="font-weight:600;font-size:.88rem">${esc(txt)}</div>`;
        return `<div style="font-size:.82rem;color:var(--clr-text-secondary)">${esc(txt)}</div>`;
    }).join("");
}

// Render Notes Grid
function renderNotes(notes) {
    notesGrid.innerHTML = "";
    if (!notes.length) { emptyState.classList.remove("hidden"); emptyTitle.textContent = currentFilter === "trashed" ? "Trash is empty" : currentFilter === "archived" ? "No archived notes" : "No notes yet"; emptyMsg.textContent = currentFilter === "all" ? "Click + to create your first note!" : "Nothing here."; return }
    emptyState.classList.add("hidden");
    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = `note-card${note.color && note.color !== "default" ? ` color-${note.color}` : ""}`;
        card.dataset.id = note.id;
        const blocks = parseBlocks(note.content);
        let badges = "";
        if (note.pinned) badges += `<span class="card-badge pin">📌 Pinned</span>`;
        if (note.passwordHash) badges += `<span class="card-badge lock">🔒 Private</span>`;
        if (note.shareId) badges += `<span class="card-badge shared">🔗 Shared</span>`;
        const labelsHTML = (note.labels || []).map(l => { const lb = userLabels.find(u => u.name === l); return `<span class="label-chip" style="background:${lb ? lb.color : "#636e72"}">${esc(l)}</span>` }).join("");
        let actions = "";
        if (note.trashed) {
            actions = `<button class="restore-btn" data-id="${note.id}" title="Restore"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button><button class="delete-btn" data-id="${note.id}" data-permanent="true" title="Delete forever"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>`;
        } else {
            actions = `<button class="edit-btn" data-id="${note.id}" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button><button class="share-btn" data-id="${note.id}" title="Share"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button><button class="delete-btn" data-id="${note.id}" title="Trash"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>`;
        }
        card.innerHTML = `${badges ? `<div class="card-badges">${badges}</div>` : ""}<h3 class="note-card-title">${esc(note.title || "Untitled")}</h3><div class="note-card-content">${note.passwordHash ? "<em>🔒 Password protected content</em>" : blocksPreviewHTML(blocks)}</div>${labelsHTML ? `<div class="card-labels">${labelsHTML}</div>` : ""}<div class="note-card-footer"><span class="note-card-date">${fmtDate(note.createdAt)}</span><div class="note-card-actions">${actions}</div></div>`;
        card.addEventListener("click", e => { if (e.target.closest(".note-card-actions")) return; if (note.passwordHash) { openUnlockModal(note.id, "preview"); return } openPreview(note) });
        notesGrid.appendChild(card);
    });
    attachCardListeners();
}
function attachCardListeners() {
    document.querySelectorAll(".edit-btn").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const n = allNotes.find(x => x.id === b.dataset.id); if (!n) return; if (n.passwordHash) { openUnlockModal(n.id, "edit") } else { openEditModal(n) } }));
    document.querySelectorAll(".delete-btn").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openDeleteModal(b.dataset.id, b.dataset.permanent === "true") }));
    document.querySelectorAll(".share-btn").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openShareModal(b.dataset.id) }));
    document.querySelectorAll(".restore-btn").forEach(b => b.addEventListener("click", async e => { e.stopPropagation(); await updateNote(b.dataset.id, { trashed: false }); showToast("Restored!", "success") }));
}

// ── BLOCK EDITOR ──
let blocks = [];
function initBlocks(data = null) {
    blocks = data ? [...data] : [{ id: uid(), type: "text", html: "", content: "" }];
    renderEditorBlocks();
}
function renderEditorBlocks() {
    blocksContainer.innerHTML = "";
    blocks.forEach(b => {
        const el = document.createElement("div");
        el.className = `block${b.type === "todo" && b.checked ? " checked" : ""}`;
        el.dataset.id = b.id; el.dataset.type = b.type;
        let inner = `<span class="block-handle" title="Drag">⋮⋮</span><button class="block-type-btn" title="Change type (or type /)">${BLOCK_TYPES.find(t => t.type === b.type)?.icon || "¶"}</button>`;
        if (b.type === "divider") { inner += `<div class="block-content" style="border-top:2px solid var(--clr-border);flex:1;min-height:0;cursor:default"></div>` }
        else if (b.type === "table") { inner += renderTableBlock(b) }
        else if (b.type === "todo") { inner += `<input type="checkbox" class="block-todo-check"${b.checked ? " checked" : ""}><div class="block-content" contenteditable="true" data-placeholder="To-do item…">${b.html || esc(b.content || "")}</div>` }
        else if (b.type === "code" || b.type === "copyable") { inner += `<div class="block-content" contenteditable="true" data-placeholder="${b.type === "code" ? "Write code…" : "Copyable text…"}" style="white-space:pre-wrap">${esc(b.content || "")}</div><button class="copy-block-btn" title="Copy">Copy</button>` }
        else if (b.type === "callout") { inner += `<span style="font-size:1.1rem;cursor:pointer" class="callout-emoji-btn">${b.emoji || "💡"}</span><div class="block-content" contenteditable="true" data-placeholder="Callout text…">${b.html || esc(b.content || "")}</div>` }
        else if (b.type === "bookmark") { inner += `<div style="flex:1"><input type="text" class="bookmark-url-input" placeholder="https://..." value="${esc(b.url || "")}" style="width:100%;padding:.3rem .5rem;border:1px solid var(--clr-border);border-radius:4px;font-size:.82rem;margin-bottom:.3rem;outline:none;background:transparent;color:var(--clr-text)"><div class="block-content" contenteditable="true" data-placeholder="Description…">${b.html || esc(b.content || "")}</div></div>` }
        else { inner += `<div class="block-content" contenteditable="true" data-placeholder="${b.type === "text" ? "Type / for commands…" : "Type here…"}">${b.html || esc(b.content || "")}</div>` }
        el.innerHTML = inner;
        blocksContainer.appendChild(el);
        // Events
        const ce = el.querySelector(".block-content[contenteditable]");
        if (ce) {
            ce.addEventListener("input", () => syncBlock(b.id));
            ce.addEventListener("keydown", e => handleBlockKey(e, b.id));
        }
        el.querySelector(".block-type-btn")?.addEventListener("click", e => { e.stopPropagation(); openSlashMenu(b.id, el) });
        el.querySelector(".block-todo-check")?.addEventListener("change", function () { b.checked = this.checked; el.classList.toggle("checked", b.checked) });
        el.querySelector(".copy-block-btn")?.addEventListener("click", () => { const t = ce?.textContent || ""; navigator.clipboard.writeText(t); showToast("Copied!", "success") });
        el.querySelector(".callout-emoji-btn")?.addEventListener("click", function () { const emojis = ["💡", "⚠️", "📌", "✅", "❌", "🔥", "💎", "🎯", "📝", "🚀"]; const idx = (emojis.indexOf(this.textContent) + 1) % emojis.length; this.textContent = emojis[idx]; b.emoji = emojis[idx] });
        el.querySelector(".bookmark-url-input")?.addEventListener("input", function () { b.url = this.value });
        // Table events
        el.querySelectorAll(".table-add-row").forEach(btn => btn.addEventListener("click", () => { if (!b.rows) return; const cols = b.rows[0]?.length || 2; b.rows.push(Array(cols).fill("")); renderEditorBlocks(); showToast("Row added", "info") }));
        el.querySelectorAll(".table-add-col").forEach(btn => btn.addEventListener("click", () => { if (!b.rows) return; b.rows.forEach(r => r.push("")); renderEditorBlocks(); showToast("Column added", "info") }));
        el.querySelectorAll(".table-del-row").forEach(btn => btn.addEventListener("click", () => { if (!b.rows || b.rows.length <= 1) return; b.rows.pop(); renderEditorBlocks() }));
        el.querySelectorAll(".table-del-col").forEach(btn => btn.addEventListener("click", () => { if (!b.rows || !b.rows[0] || b.rows[0].length <= 1) return; b.rows.forEach(r => r.pop()); renderEditorBlocks() }));
        el.querySelectorAll("td[contenteditable]").forEach(td => { td.addEventListener("input", () => { const ri = +td.dataset.row, ci = +td.dataset.col; if (b.rows && b.rows[ri]) b.rows[ri][ci] = td.textContent }) });
    });
}
function renderTableBlock(b) {
    if (!b.rows) b.rows = [["", "", ""], ["", "", ""], ["", "", ""]];
    let html = `<div class="block-table-wrap" style="flex:1"><table class="block-table">${b.rows.map((r, ri) => `<tr>${r.map((c, ci) => `<td contenteditable="true" data-row="${ri}" data-col="${ci}">${esc(c)}</td>`).join("")}</tr>`).join("")}</table><div class="table-controls"><button class="table-add-row">+ Row</button><button class="table-add-col">+ Col</button><button class="table-del-row">- Row</button><button class="table-del-col">- Col</button></div></div>`;
    return html;
}
function syncBlock(id) {
    const b = blocks.find(x => x.id === id); if (!b) return;
    const el = blocksContainer.querySelector(`[data-id="${id}"] .block-content[contenteditable]`);
    if (!el) return;
    if (b.type === "code" || b.type === "copyable") b.content = el.textContent;
    else b.html = el.innerHTML;
}
function handleBlockKey(e, id) {
    const idx = blocks.findIndex(x => x.id === id);
    if (e.key === "Enter" && !e.shiftKey && !["code", "copyable"].includes(blocks[idx]?.type)) {
        e.preventDefault();
        const newBlock = { id: uid(), type: "text", html: "", content: "" };
        blocks.splice(idx + 1, 0, newBlock); renderEditorBlocks();
        focusBlock(newBlock.id);
    }
    if (e.key === "Backspace") {
        const el = e.target;
        if ((el.textContent === "" || el.innerHTML === "<br>") && blocks.length > 1) {
            e.preventDefault(); blocks.splice(idx, 1); renderEditorBlocks();
            if (idx > 0) focusBlock(blocks[idx - 1].id);
        }
    }
    if (e.key === "/" && e.target.textContent === "") {
        e.preventDefault(); openSlashMenu(id, blocksContainer.querySelector(`[data-id="${id}"]`));
    }
}
function focusBlock(id) {
    setTimeout(() => { const el = blocksContainer.querySelector(`[data-id="${id}"] .block-content[contenteditable]`); el?.focus() }, 20);
}
addBlockBtn.addEventListener("click", () => { const b = { id: uid(), type: "text", html: "", content: "" }; blocks.push(b); renderEditorBlocks(); focusBlock(b.id) });

// Slash Menu
function openSlashMenu(blockId, blockEl) {
    slashBlockId = blockId; slashFilter.value = "";
    renderSlashOptions("");
    const rect = blockEl.getBoundingClientRect(); const container = noteModal.querySelector(".modal-body"); const cr = container.getBoundingClientRect();
    slashMenu.style.top = `${rect.bottom - cr.top + container.scrollTop}px`;
    slashMenu.style.left = `${rect.left - cr.left + 30}px`;
    slashMenu.classList.remove("hidden"); slashFilter.focus();
}
function closeSlashMenu() { slashMenu.classList.add("hidden"); slashBlockId = null }
function renderSlashOptions(filter) {
    const f = filter.toLowerCase();
    slashOptions.innerHTML = "";
    BLOCK_TYPES.filter(t => t.label.toLowerCase().includes(f) || t.desc.toLowerCase().includes(f)).forEach(t => {
        const btn = document.createElement("button"); btn.className = "slash-option";
        btn.innerHTML = `<span class="slash-icon">${t.icon}</span><div><div>${t.label}</div><div class="slash-desc">${t.desc}</div></div>`;
        btn.addEventListener("click", () => { changeBlockType(slashBlockId, t.type); closeSlashMenu() });
        slashOptions.appendChild(btn);
    });
}
slashFilter.addEventListener("input", () => renderSlashOptions(slashFilter.value));
slashFilter.addEventListener("keydown", e => {
    if (e.key === "Escape") closeSlashMenu();
    if (e.key === "Enter") { const first = slashOptions.querySelector(".slash-option"); if (first) first.click() }
});
function changeBlockType(id, type) {
    const b = blocks.find(x => x.id === id); if (!b) return;
    syncBlock(id); b.type = type;
    if (type === "table" && !b.rows) b.rows = [["", "", ""], ["", "", ""], ["", "", ""]];
    if (type === "divider") { b.html = ""; b.content = "" }
    if (type === "todo") b.checked = false;
    if (type === "callout" && !b.emoji) b.emoji = "💡";
    renderEditorBlocks(); if (type !== "divider" && type !== "table") focusBlock(id);
}

// Inline formatting toolbar
blockToolbar.addEventListener("click", e => {
    const btn = e.target.closest(".tb-btn"); if (!btn) return; e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
});
$("linkBtn").addEventListener("click", () => { const url = prompt("URL:"); if (url) document.execCommand("createLink", false, url) });

// Get blocks data for saving
function getBlocksData() { blocks.forEach(b => syncBlock(b.id)); return blocks.map(b => { const d = { id: b.id, type: b.type }; if (b.type === "code" || b.type === "copyable") d.content = b.content || ""; else d.html = b.html || ""; if (b.type === "todo") d.checked = !!b.checked; if (b.type === "table") d.rows = b.rows; if (b.type === "callout") d.emoji = b.emoji || "💡"; if (b.type === "bookmark") { d.url = b.url || ""; d.content = b.content || "" } return d }) }

// ── NOTE MODAL ──
function openCreateModal() {
    modalTitle.textContent = "New Note"; noteIdInput.value = ""; noteTitle.value = "";
    editColor = "default"; editPinned = false; editLabels = []; editLocked = false; editPwHash = "";
    updateColorDots(); updatePinBtn(); updateLockBtn(); renderLabelPicker(); renderSelectedLabels();
    initBlocks(); noteModal.classList.remove("hidden"); noteTitle.focus();
}
function openEditModal(note) {
    modalTitle.textContent = "Edit Note"; noteIdInput.value = note.id; noteTitle.value = note.title || "";
    editColor = note.color || "default"; editPinned = note.pinned || false; editLabels = [...(note.labels || [])];
    editLocked = !!note.passwordHash; editPwHash = note.passwordHash || "";
    updateColorDots(); updatePinBtn(); updateLockBtn(); renderLabelPicker(); renderSelectedLabels();
    initBlocks(parseBlocks(note.content)); noteModal.classList.remove("hidden"); noteTitle.focus();
}
function closeNoteModal() { noteModal.classList.add("hidden"); closeSlashMenu() }
modalClose.addEventListener("click", closeNoteModal); modalCancel.addEventListener("click", closeNoteModal);
noteModal.addEventListener("click", e => { if (e.target === noteModal) closeNoteModal() });

// Save
saveNoteBtn.addEventListener("click", async () => {
    const title = noteTitle.value.trim(); if (!title) { showToast("Add a title", "error"); return }
    const id = noteIdInput.value; const blocksData = getBlocksData();
    setLoading(saveNoteBtn, true);
    try {
        const data = { title, content: JSON.stringify(blocksData), color: editColor, pinned: editPinned, labels: editLabels, passwordHash: editPwHash, archived: false, trashed: false };
        if (id) { const ex = allNotes.find(n => n.id === id); if (ex) { data.archived = ex.archived; data.trashed = ex.trashed; if (ex.shareId) data.shareId = ex.shareId } await updateNote(id, data); showToast("Updated!", "success") }
        else { await createNote(data); showToast("Created!", "success") }
        closeNoteModal();
    } catch (err) { console.error(err); showToast("Save failed", "error") } finally { setLoading(saveNoteBtn, false) }
});

// FAB
fabAdd.addEventListener("click", openCreateModal);

// Color picker
colorPickerBtn.addEventListener("click", e => { e.stopPropagation(); colorPicker.classList.toggle("hidden"); labelPicker.classList.add("hidden") });
colorPicker.addEventListener("click", e => { const d = e.target.closest(".color-dot"); if (d) { editColor = d.dataset.color; updateColorDots() } });
function updateColorDots() { colorPicker.querySelectorAll(".color-dot").forEach(d => d.classList.toggle("active", d.dataset.color === editColor)) }

// Pin
pinToggleBtn.addEventListener("click", () => { editPinned = !editPinned; updatePinBtn() });
function updatePinBtn() { pinToggleBtn.classList.toggle("active", editPinned) }

// Lock
lockToggleBtn.addEventListener("click", () => { openPasswordModal() });
function updateLockBtn() { lockToggleBtn.classList.toggle("active", editLocked) }

// ── PASSWORD MODAL ──
function openPasswordModal() {
    if (editLocked) { pwModalTitle.textContent = "Password Protected"; pwModalDesc.textContent = "This note is password protected."; pwRemoveBtn.style.display = "inline-flex"; pwConfirmGroup.style.display = "none"; notePwInput.value = "" }
    else { pwModalTitle.textContent = "Set Password"; pwModalDesc.textContent = "Set a password to protect this note."; pwRemoveBtn.style.display = "none"; pwConfirmGroup.style.display = "block"; notePwInput.value = ""; notePwConfirm.value = "" }
    passwordModal.classList.remove("hidden");
}
pwCancelBtn.addEventListener("click", () => passwordModal.classList.add("hidden"));
pwModalClose.addEventListener("click", () => passwordModal.classList.add("hidden"));
passwordModal.addEventListener("click", e => { if (e.target === passwordModal) passwordModal.classList.add("hidden") });
pwSaveBtn.addEventListener("click", async () => {
    const pw = notePwInput.value; if (!pw) { showToast("Enter a password", "error"); return }
    if (!editLocked && pw !== notePwConfirm.value) { showToast("Passwords don't match", "error"); return }
    editPwHash = await hashPw(pw); editLocked = true; updateLockBtn();
    passwordModal.classList.add("hidden"); showToast("Password set!", "success");
});
pwRemoveBtn.addEventListener("click", () => { editPwHash = ""; editLocked = false; updateLockBtn(); passwordModal.classList.add("hidden"); showToast("Password removed", "info") });

// ── UNLOCK MODAL ──
let unlockCallback = null;
function openUnlockModal(noteId, action) {
    unlockNoteIdEl.value = noteId; unlockPwInput.value = ""; unlockError.classList.add("hidden");
    unlockCallback = action; unlockModal.classList.remove("hidden"); unlockPwInput.focus();
}
unlockCancelBtn.addEventListener("click", () => unlockModal.classList.add("hidden"));
unlockModalClose.addEventListener("click", () => unlockModal.classList.add("hidden"));
unlockModal.addEventListener("click", e => { if (e.target === unlockModal) unlockModal.classList.add("hidden") });
unlockSubmitBtn.addEventListener("click", async () => {
    const id = unlockNoteIdEl.value; const note = allNotes.find(n => n.id === id); if (!note) return;
    const h = await hashPw(unlockPwInput.value);
    if (h !== note.passwordHash) { unlockError.classList.remove("hidden"); return }
    unlockModal.classList.add("hidden");
    if (unlockCallback === "edit") openEditModal(note);
    else openPreview(note);
});
unlockPwInput.addEventListener("keydown", e => { if (e.key === "Enter") unlockSubmitBtn.click() });

// ── SHARE MODAL ──
function openShareModal(noteId) {
    const note = allNotes.find(n => n.id === noteId); if (!note) return;
    shareNoteId.value = noteId;
    shareToggle.checked = !!note.shareId;
    sharePwToggle.checked = false;
    sharePwInput.value = "";
    sharePwGroup.classList.add("hidden");
    if (note.shareId) {
        shareLinkBox.classList.remove("hidden");
        shareOptions.classList.remove("hidden");
        shareLinkInput.value = `${location.origin}/shared.html?id=${note.shareId}`;
        // Check if the shared note has a password by checking Firestore
        getDoc(doc(db, "sharedNotes", note.shareId)).then(snap => {
            if (snap.exists() && snap.data().passwordHash) {
                sharePwToggle.checked = true;
                sharePwGroup.classList.remove("hidden");
            }
        }).catch(() => { });
    } else {
        shareLinkBox.classList.add("hidden");
        shareOptions.classList.add("hidden");
    }
    shareModal.classList.remove("hidden");
}
shareModalClose.addEventListener("click", () => shareModal.classList.add("hidden"));
shareCloseBtn.addEventListener("click", () => shareModal.classList.add("hidden"));
shareModal.addEventListener("click", e => { if (e.target === shareModal) shareModal.classList.add("hidden") });
shareToggle.addEventListener("change", async () => {
    const noteId = shareNoteId.value; const note = allNotes.find(n => n.id === noteId); if (!note) return;
    try {
        if (shareToggle.checked) {
            const sid = uid() + uid();
            const shareData = { title: note.title || "Untitled", content: note.content || "", labels: note.labels || [], color: note.color || "default", ownerId: currentUser.uid, ownerName: currentUser.displayName || "Anonymous", createdAt: serverTimestamp() };
            if (sharePwToggle.checked && sharePwInput.value) shareData.passwordHash = await hashPw(sharePwInput.value);
            await setDoc(doc(db, "sharedNotes", sid), shareData);
            await updateNote(noteId, { shareId: sid });
            shareLinkInput.value = `${location.origin}/shared.html?id=${sid}`;
            shareLinkBox.classList.remove("hidden"); shareOptions.classList.remove("hidden");
            showToast("Sharing enabled!", "success");
        } else {
            if (note.shareId) { try { await deleteDoc(doc(db, "sharedNotes", note.shareId)) } catch (e) { } }
            await updateNote(noteId, { shareId: "" });
            shareLinkBox.classList.add("hidden"); shareOptions.classList.add("hidden");
            sharePwToggle.checked = false; sharePwInput.value = ""; sharePwGroup.classList.add("hidden");
            showToast("Sharing disabled", "info");
        }
    } catch (err) {
        console.error("Share error:", err);
        shareToggle.checked = !shareToggle.checked; // revert toggle
        showToast("Failed to share: " + err.message, "error");
    }
});
sharePwToggle.addEventListener("change", async () => {
    sharePwGroup.classList.toggle("hidden", !sharePwToggle.checked);
    const noteId = shareNoteId.value;
    const note = allNotes.find(n => n.id === noteId);
    if (!note || !note.shareId) return; // only update if already shared
    try {
        if (sharePwToggle.checked) {
            // Show password field, user will type and it auto-saves on input blur or explicit action
            sharePwInput.value = "";
            sharePwInput.focus();
        } else {
            // Remove password from existing share
            await updateDoc(doc(db, "sharedNotes", note.shareId), { passwordHash: "" });
            sharePwInput.value = "";
            showToast("Share password removed", "info");
        }
    } catch (err) {
        console.error("Share password error:", err);
        sharePwToggle.checked = !sharePwToggle.checked;
        sharePwGroup.classList.toggle("hidden", !sharePwToggle.checked);
        showToast("Failed to update password: " + err.message, "error");
    }
});
// Set share password when user finishes typing (on blur or Enter)
sharePwInput.addEventListener("keydown", async e => {
    if (e.key === "Enter") { e.preventDefault(); await applySharePassword(); }
});
sharePwInput.addEventListener("blur", async () => { await applySharePassword(); });
async function applySharePassword() {
    const noteId = shareNoteId.value;
    const note = allNotes.find(n => n.id === noteId);
    if (!note || !note.shareId || !sharePwInput.value) return;
    try {
        const hash = await hashPw(sharePwInput.value);
        await updateDoc(doc(db, "sharedNotes", note.shareId), { passwordHash: hash });
        showToast("Share password set!", "success");
    } catch (err) {
        console.error("Set share password error:", err);
        showToast("Failed to set password: " + err.message, "error");
    }
}
$("setSharePwBtn").addEventListener("click", async () => { await applySharePassword(); });
copyLinkBtn.addEventListener("click", () => { navigator.clipboard.writeText(shareLinkInput.value); showToast("Link copied!", "success") });
// Share buttons
$("shareEmail").addEventListener("click", () => { const url = shareLinkInput.value; const note = allNotes.find(n => n.id === shareNoteId.value); window.open(`mailto:?subject=${encodeURIComponent(note?.title || "Shared Note")}&body=${encodeURIComponent("Check out this note: " + url)}`) });
$("shareWhatsapp").addEventListener("click", () => window.open(`https://wa.me/?text=${encodeURIComponent(shareLinkInput.value)}`));
$("shareTwitter").addEventListener("click", () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLinkInput.value)}&text=${encodeURIComponent("Check out my note!")}`));
$("shareLinkedin").addEventListener("click", () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLinkInput.value)}`));
$("shareTelegram").addEventListener("click", () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLinkInput.value)}`));
$("shareEmbed").addEventListener("click", () => { const code = `<iframe src="${shareLinkInput.value}" width="100%" height="500" frameborder="0"></iframe>`; navigator.clipboard.writeText(code); showToast("Embed code copied!", "success") });

// ── DELETE MODAL ──
function openDeleteModal(id, perm = false) {
    deleteNoteIdInput.value = id; isPermanentDelete = perm;
    deleteTitle.textContent = perm ? "Delete Permanently" : "Move to Trash";
    deleteMsg.textContent = perm ? "Permanently delete? Cannot undo." : "Move to trash? You can restore later.";
    deleteModal.classList.remove("hidden");
}
deleteModalClose.addEventListener("click", () => deleteModal.classList.add("hidden"));
deleteCancelBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));
deleteModal.addEventListener("click", e => { if (e.target === deleteModal) deleteModal.classList.add("hidden") });
confirmDeleteBtn.addEventListener("click", async () => {
    const id = deleteNoteIdInput.value; if (!id) return; setLoading(confirmDeleteBtn, true);
    try {
        if (isPermanentDelete) { const note = allNotes.find(n => n.id === id); if (note?.shareId) try { await deleteDoc(doc(db, "sharedNotes", note.shareId)) } catch (e) { } await deleteNote(id); showToast("Deleted permanently", "info") }
        else { await updateNote(id, { trashed: true }); showToast("Moved to trash", "info") }
        deleteModal.classList.add("hidden");
    } catch (e) { showToast("Failed", "error") } finally { setLoading(confirmDeleteBtn, false) }
});

// ── PREVIEW MODAL ──
function openPreview(note) {
    previewingNote = note; previewTitle.textContent = note.title || "Untitled";
    previewMeta.innerHTML = `<span>${fmtDate(note.createdAt)}</span>${note.shareId ? `<span>🔗 Shared</span>` : ""}${note.passwordHash ? `<span>🔒 Private</span>` : ""}`;
    previewLabels.innerHTML = (note.labels || []).map(l => { const lb = userLabels.find(u => u.name === l); return `<span class="label-chip" style="background:${lb ? lb.color : "#636e72"}">${esc(l)}</span>` }).join("");
    const blocks = parseBlocks(note.content); previewContent.innerHTML = renderBlocksHTML(blocks);
    previewModal.classList.remove("hidden");
}
previewClose.addEventListener("click", () => previewModal.classList.add("hidden"));
previewModal.addEventListener("click", e => { if (e.target === previewModal) previewModal.classList.add("hidden") });
previewEditBtn.addEventListener("click", () => { previewModal.classList.add("hidden"); if (previewingNote) openEditModal(previewingNote) });
previewShareBtn.addEventListener("click", () => { previewModal.classList.add("hidden"); if (previewingNote) openShareModal(previewingNote.id) });
previewDuplicateBtn.addEventListener("click", async () => { if (!previewingNote) return; previewModal.classList.add("hidden"); await createNote({ title: `${previewingNote.title} (copy)`, content: previewingNote.content, color: previewingNote.color || "default", pinned: false, archived: false, trashed: false, labels: previewingNote.labels || [], passwordHash: "" }); showToast("Duplicated!", "success") });
previewExportBtn.addEventListener("click", () => { if (!previewingNote) return; const blocks = parseBlocks(previewingNote.content); let txt = `# ${previewingNote.title}\n\n`; blocks.forEach(b => { if (b.type === "divider") txt += "---\n"; else if (b.type === "todo") txt += `${b.checked ? "[x]" : "[ ]"} ${(b.content || b.html || "").replace(/<[^>]*>/g, "")}\n`; else if (b.type === "table" && b.rows) b.rows.forEach(r => txt += r.join(" | ") + "\n"); else txt += (b.content || b.html || "").replace(/<[^>]*>/g, "") + "\n" }); const blob = new Blob([txt], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${(previewingNote.title || "note").replace(/[^a-z0-9]/gi, "_")}.txt`; a.click(); showToast("Exported!", "success") });

// ── DELETE ACCOUNT ──
deleteAccountBtn.addEventListener("click", () => { delAccPassword.value = ""; delAccError.classList.add("hidden"); deleteAccountModal.classList.remove("hidden") });
delAccClose.addEventListener("click", () => deleteAccountModal.classList.add("hidden"));
delAccCancel.addEventListener("click", () => deleteAccountModal.classList.add("hidden"));
deleteAccountModal.addEventListener("click", e => { if (e.target === deleteAccountModal) deleteAccountModal.classList.add("hidden") });
delAccConfirm.addEventListener("click", async () => {
    const pw = delAccPassword.value; if (!pw) { showToast("Enter password", "error"); return }
    setLoading(delAccConfirm, true); delAccError.classList.add("hidden");
    try {
        const cred = EmailAuthProvider.credential(currentUser.email, pw);
        await reauthenticateWithCredential(currentUser, cred);
        // Delete all notes
        const snap = await getDocs(collection(db, "users", currentUser.uid, "notes"));
        for (const d of snap.docs) { if (d.data().shareId) try { await deleteDoc(doc(db, "sharedNotes", d.data().shareId)) } catch (e) { } await deleteDoc(d.ref) }
        if (unsubscribe) unsubscribe();
        await deleteUser(currentUser);
        showToast("Account deleted", "info");
        setTimeout(() => window.location.href = "index.html", 1500);
    } catch (err) { console.error(err); if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") delAccError.classList.remove("hidden"); else showToast("Failed to delete account", "error") }
    finally { setLoading(delAccConfirm, false) }
});

// ── LABELS ──
function loadUserLabels() { const s = localStorage.getItem(`nv-labels-${currentUser.uid}`); if (s) userLabels = JSON.parse(s); else { userLabels = [{ name: "Personal", color: "#6c5ce7" }, { name: "Work", color: "#0984e3" }, { name: "Important", color: "#d63031" }, { name: "Ideas", color: "#00b894" }, { name: "Study", color: "#fdcb6e" }]; saveUserLabels() } renderSidebarLabels() }
function saveUserLabels() { localStorage.setItem(`nv-labels-${currentUser.uid}`, JSON.stringify(userLabels)) }
function renderSidebarLabels() { sidebarLabels.innerHTML = ""; userLabels.forEach(l => { const b = document.createElement("button"); b.className = `sidebar-label-item${currentLabelFilter === l.name ? " active" : ""}`; b.innerHTML = `<span class="label-dot" style="background:${l.color}"></span><span>${esc(l.name)}</span>`; b.addEventListener("click", () => { currentLabelFilter = currentLabelFilter === l.name ? null : l.name; if (currentLabelFilter) currentFilter = "all"; updateSidebarActive(); renderSidebarLabels(); renderFiltered(); updateViewTitle() }); sidebarLabels.appendChild(b) }) }
function renderLabelPicker() { labelOptions.innerHTML = ""; userLabels.forEach(l => { const b = document.createElement("button"); b.className = `label-option${editLabels.includes(l.name) ? " selected" : ""}`; b.innerHTML = `<span class="label-dot" style="background:${l.color}"></span><span>${esc(l.name)}</span><span class="label-check">✓</span>`; b.addEventListener("click", () => { editLabels = editLabels.includes(l.name) ? editLabels.filter(x => x !== l.name) : [...editLabels, l.name]; renderLabelPicker(); renderSelectedLabels() }); labelOptions.appendChild(b) }) }
function renderSelectedLabels() { selectedLabels.innerHTML = ""; editLabels.forEach(n => { const lb = userLabels.find(l => l.name === n); const c = document.createElement("span"); c.className = "label-chip"; c.style.background = lb ? lb.color : "#636e72"; c.textContent = n; c.style.cursor = "pointer"; c.addEventListener("click", () => { editLabels = editLabels.filter(x => x !== n); renderLabelPicker(); renderSelectedLabels() }); selectedLabels.appendChild(c) }) }
labelPickerBtn.addEventListener("click", e => { e.stopPropagation(); labelPicker.classList.toggle("hidden"); colorPicker.classList.add("hidden") });
addLabelBtn.addEventListener("click", () => { const n = newLabelInput.value.trim(); if (!n || userLabels.find(l => l.name === n)) return; userLabels.push({ name: n, color: LABEL_COLORS[userLabels.length % LABEL_COLORS.length] }); saveUserLabels(); newLabelInput.value = ""; renderLabelPicker(); renderSidebarLabels() });
newLabelInput.addEventListener("keydown", e => { if (e.key === "Enter") addLabelBtn.click() });

// ── SIDEBAR ──
document.querySelectorAll(".sidebar-item[data-filter]").forEach(b => b.addEventListener("click", () => { currentFilter = b.dataset.filter; currentLabelFilter = null; updateSidebarActive(); renderSidebarLabels(); renderFiltered(); updateViewTitle(); closeSidebar() }));
function updateSidebarActive() { document.querySelectorAll(".sidebar-item").forEach(b => b.classList.toggle("active", b.dataset.filter === currentFilter && !currentLabelFilter)) }
function updateViewTitle() { const t = { all: "All Notes", pinned: "Pinned", locked: "Private Notes", shared: "Shared Notes", archived: "Archive", trashed: "Trash" }; viewTitle.textContent = currentLabelFilter ? `Label: ${currentLabelFilter}` : (t[currentFilter] || "All Notes") }
function updateCounts() {
    const a = n => !n.archived && !n.trashed;
    $("countAll").textContent = allNotes.filter(a).length;
    $("countPinned").textContent = allNotes.filter(n => n.pinned && a(n)).length;
    $("countLocked").textContent = allNotes.filter(n => n.passwordHash && a(n)).length;
    $("countShared").textContent = allNotes.filter(n => n.shareId && a(n)).length;
    $("countArchived").textContent = allNotes.filter(n => n.archived && !n.trashed).length;
    $("countTrashed").textContent = allNotes.filter(n => n.trashed).length;
}

// ── SIDEBAR TOGGLE ──
sidebarToggle.addEventListener("click", () => { sidebar.classList.toggle("open"); sidebarOverlay.classList.toggle("hidden") });
sidebarOverlay.addEventListener("click", closeSidebar);
function closeSidebar() { sidebar.classList.remove("open"); sidebarOverlay.classList.add("hidden") }

// ── SEARCH, SORT, VIEW ──
searchInput.addEventListener("input", renderFiltered);
sortSelect.addEventListener("change", () => { currentSort = sortSelect.value; renderFiltered() });
viewToggle.addEventListener("click", () => { isListView = !isListView; notesGrid.classList.toggle("list-view", isListView); viewToggle.querySelector(".grid-icon").classList.toggle("hidden", isListView); viewToggle.querySelector(".list-icon").classList.toggle("hidden", !isListView) });

// ── DARK MODE ──
if (localStorage.getItem("notevault-darkmode") === "true") document.body.classList.add("dark");
darkModeToggle.addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("notevault-darkmode", document.body.classList.contains("dark")) });

// ── USER MENU ──
userAvatar.addEventListener("click", e => { e.stopPropagation(); userDropdown.classList.toggle("hidden") });
document.addEventListener("click", e => { if (!e.target.closest(".user-menu")) userDropdown.classList.add("hidden"); if (!e.target.closest(".color-picker-wrap")) colorPicker.classList.add("hidden"); if (!e.target.closest(".label-picker-wrap")) labelPicker.classList.add("hidden") });
logoutBtn.addEventListener("click", async () => { if (unsubscribe) unsubscribe(); await signOut(auth) });

// ── KEYBOARD SHORTCUTS ──
document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openCreateModal() }
    if (e.key === "/") { e.preventDefault(); searchInput.focus() }
    if (e.key === "d" || e.key === "D") { e.preventDefault(); darkModeToggle.click() }
    if (e.key === "g" || e.key === "G") { e.preventDefault(); viewToggle.click() }
    if (e.key === "?") { e.preventDefault(); shortcutsModal.classList.toggle("hidden") }
    if (e.key === "Escape") { closeNoteModal(); deleteModal.classList.add("hidden"); shareModal.classList.add("hidden"); passwordModal.classList.add("hidden"); unlockModal.classList.add("hidden"); previewModal.classList.add("hidden"); shortcutsModal.classList.add("hidden"); deleteAccountModal.classList.add("hidden"); closeSlashMenu() }
});
shortcutsClose.addEventListener("click", () => shortcutsModal.classList.add("hidden"));
shortcutsModal.addEventListener("click", e => { if (e.target === shortcutsModal) shortcutsModal.classList.add("hidden") });
