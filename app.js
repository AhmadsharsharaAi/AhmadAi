const $ = (id) => document.getElementById(id);
const STORAGE = "ahmad-ai-v01";
let state = loadState();

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE)) || {tasks:[], approvals:[], messages:[]}; }
  catch { return {tasks:[], approvals:[], messages:[]}; }
}
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function safe(text){ return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function addMessage(role, text){
  state.messages.push({role,text});
  save(); renderMessages();
}
function renderMessages(){
  const box = $("messages");
  const initial = `<article class="message assistant"><b>AHMAD AI</b><p>أهلاً بك! أنا النسخة الأولية من مساعدك. جرّب: «أنشئ مهمة لمتابعة العملاء» أو «جهّز رسالة إلى شركة». لن أرسل أي شيء خارج التطبيق.</p></article>`;
  box.innerHTML = (state.messages.length ? state.messages.map(m => `<article class="message ${m.role}"><b>${m.role==="user"?"أنت":"AHMAD AI"}</b><p>${safe(m.text)}</p></article>`).join("") : initial);
  box.scrollTop = box.scrollHeight;
}
function renderTasks(){
  $("taskCount").textContent = state.tasks.length;
  $("tasks").innerHTML = state.tasks.length ? state.tasks.map(t => `<label class="task ${t.done?"done":""}"><input type="checkbox" data-task="${t.id}" ${t.done?"checked":""}><span class="task-title">${safe(t.title)}</span><small>${t.done?"مكتملة":"قيد المتابعة"}</small></label>`).join("") : `<p class="empty">لا توجد مهام بعد.</p>`;
  $("tasks").querySelectorAll("[data-task]").forEach(el => el.addEventListener("change", () => {
    const task = state.tasks.find(t => t.id === el.dataset.task); if(task){task.done=el.checked;save();renderTasks();}
  }));
}
function renderApprovals(){
  $("approvalCount").textContent = state.approvals.filter(a=>a.status==="pending").length;
  const pending = state.approvals.filter(a=>a.status==="pending");
  $("approvals").innerHTML = pending.length ? pending.map(a => `<article class="approval"><small>إجراء يحتاج موافقتك</small><p>${safe(a.description)}</p><div class="approval-actions"><button class="approve" data-approve="${a.id}">موافقة</button><button class="reject" data-reject="${a.id}">رفض</button></div></article>`).join("") : `<p class="empty">لا توجد إجراءات بانتظار الموافقة.</p>`;
  $("approvals").querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click",()=>decide(b.dataset.approve,"approved")));
  $("approvals").querySelectorAll("[data-reject]").forEach(b=>b.addEventListener("click",()=>decide(b.dataset.reject,"rejected")));
}
function decide(id,status){
  const a=state.approvals.find(x=>x.id===id); if(!a)return;
  a.status=status; save(); renderApprovals();
  addMessage("assistant", status==="approved" ? "تم تسجيل موافقتك في النموذج الأولي. لم يُنفّذ أي إجراء خارجي؛ الربط بالخدمات سيضاف في مرحلة لاحقة." : "تم تسجيل رفض الإجراء. لم يتم تنفيذه.");
}
function createTask(title){
  state.tasks.unshift({id:crypto.randomUUID(),title,done:false,createdAt:new Date().toISOString()});
  save();renderTasks();
}
function createApproval(description){
  state.approvals.unshift({id:crypto.randomUUID(),description,status:"pending"});
  save();renderApprovals();
}
function handlePrompt(raw){
  const text=raw.trim(); if(!text)return;
  addMessage("user",text);
  const lower=text.toLowerCase();
  if(/اعرض|أظهر|قائمة/.test(text) && /مهام|المهام/.test(text)){
    addMessage("assistant", state.tasks.length ? "هذه مهامك الحالية:\n"+state.tasks.map((t,i)=>`${i+1}. ${t.title} — ${t.done?"مكتملة":"قيد المتابعة"}`).join("\n") : "لا توجد مهام محفوظة حالياً.");
  } else if(/أنشئ مهمة|اضف مهمة|أضف مهمة|مهمة جديدة/.test(text)){
    const title=text.replace(/^(من فضلك\s*)?(أنشئ مهمة|اضف مهمة|أضف مهمة|مهمة جديدة)\s*/,"").trim() || "مهمة جديدة";
    createTask(title); addMessage("assistant",`أضفت المهمة: «${title}» إلى قائمتك على هذا الجهاز.`);
  } else if(/جهّز رسالة|جهز رسالة|أرسل رسالة|ارسل رسالة/.test(text)){
    createApproval("إعداد أو إرسال رسالة خارج التطبيق: "+text+"\nملاحظة: هذه النسخة لا ترسل البريد أو الرسائل بعد. الموافقة هنا تسجل قرارك فقط.");
    addMessage("assistant","أستطيع في هذه النسخة تسجيل طلب الرسالة وطلب موافقتك، لكن الإرسال الفعلي غير متصل بعد. أضفت الطلب إلى مركز الموافقات.");
  } else if(/ابحث|حلل|أنشئ تطبيق|أنشئ موقع/.test(text)){
    createApproval("طلب يحتاج أداة خارجية أو اتصالاً بخدمة: "+text);
    addMessage("assistant","فهمت طلبك وسجلته كإجراء يحتاج مراجعة. محرك الذكاء والبحث الخارجي لم يُربطا بعد، لذلك لن أدّعي أن المهمة نُفذت.");
  } else {
    addMessage("assistant","استلمت طلبك. هذه نسخة تأسيسية تعمل محلياً وليست متصلة بعد بنموذج ذكاء اصطناعي. يمكنني حالياً إدارة المهام وتسجيل طلبات تحتاج موافقة. الخطوة التالية هي ربط محرك الذكاء عبر خادم آمن حتى أفهم الطلبات المفتوحة وأخطط لها.");
  }
}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();handlePrompt($("prompt").value);$("prompt").value="";});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>handlePrompt(b.dataset.prompt)));
$("clearChat").addEventListener("click",()=>{state.messages=[];save();renderMessages();});
renderMessages();renderTasks();renderApprovals();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}