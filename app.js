const cfg = window.DIGIWEB_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_");
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
let currentUser=null, currentProfile=null;

const $=s=>document.querySelector(s);
const toast=(m)=>{const t=$("#toast");t.textContent=m;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),3500)};
const money=n=>new Intl.NumberFormat("fa-IR").format(Number(n||0))+" تومان";
const statusFa={pending_review:"در انتظار بررسی",in_review:"در حال بررسی",pending_payment:"در انتظار پرداخت",paid:"پرداخت شد",in_progress:"در حال طراحی",first_draft_sent:"نسخه اولیه",revisions:"اصلاحات",completed:"تکمیل شد",delivered:"تحویل نهایی",registered:"ثبت شده",pending:"در انتظار بررسی",approved:"تأیید شد",rejected:"رد شد",open:"باز",answered:"پاسخ داده شد",closed:"بسته"};
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function needConfig(){if(!sb){toast("ابتدا اطلاعات Supabase را در config.js وارد کن.");return true}return false}

async function loadPublic(){
 if(!sb){$("#portfolioList").innerHTML='<div class="card">نمونه‌کارها بعد از اتصال Supabase نمایش داده می‌شوند.</div>';$("#plansList").innerHTML='<div class="card">پلن‌ها بعد از اتصال Supabase نمایش داده می‌شوند.</div>';return}
 const [p1,p2,stats]=await Promise.all([sb.from("portfolio").select("*").order("sort_order"),sb.from("plans").select("*").order("sort_order"),sb.from("site_stats").select("*").eq("id",1).maybeSingle()]);
 if(stats.data){$("#statProjects").textContent=stats.data.projects_done+"+";$("#statClients").textContent=stats.data.happy_clients+"+"}
 $("#portfolioList").innerHTML=(p1.data||[]).map(x=>`<article class="card portfolio-item">${x.image_url?`<img src="${x.image_url}" style="width:100%;height:150px;object-fit:cover;border-radius:12px">`:""}<h3>${escapeHtml(x.title)}</h3><small>${escapeHtml(x.category)}</small><p>${escapeHtml(x.description||"")}</p>${x.project_url?`<a class="btn ghost" target="_blank" href="${x.project_url}">مشاهده</a>`:""}</article>`).join("")||'<div class="card">نمونه‌کاری ثبت نشده است.</div>';
 $("#plansList").innerHTML=(p2.data||[]).map(x=>`<article class="card plan ${x.is_featured?"featured":""}"><h3>${escapeHtml(x.title)}</h3><div class="price">${x.price_from?money(x.price_from):"توافقی"}</div><p>${x.pages_count} • ${x.delivery_days} روز</p><ul>${(x.features||[]).map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul><button class="btn primary choose-plan" data-plan="${x.id}">انتخاب این پلن</button></article>`).join("")||'<div class="card">پلنی ثبت نشده است.</div>';
 document.querySelectorAll(".choose-plan").forEach(b=>b.onclick=()=>openProject(b.dataset.plan));
}

function authHtml(mode){
 const register=mode==="register";
 return `<h2>${register?"ساخت حساب کاربری":"ورود به دیجی وب"}</h2><div class="auth-tabs"><button data-switch="login">ورود</button><button data-switch="register">ثبت‌نام</button></div>
 <form id="authForm" class="form">${register?`<input name="full_name" placeholder="نام و نام خانوادگی" required><input name="username" placeholder="نام کاربری" required><input name="phone" placeholder="شماره موبایل">`:""}<input name="email" type="email" placeholder="ایمیل" required><input name="password" type="password" placeholder="رمز عبور" required>${register?`<input name="confirm" type="password" placeholder="تکرار رمز عبور" required>`:""}<button class="btn primary">${register?"ثبت‌نام":"ورود"}</button><p class="note">${register?"پس از ثبت‌نام ممکن است لازم باشد ایمیل خود را تأیید کنید.":"با ورود، به پنل پروژه‌های خود می‌روید."}</p></form>`;
}
function openAuth(mode="login"){ $("#authModal").classList.remove("hidden");$("#authContent").innerHTML=authHtml(mode);$("#authContent").querySelectorAll("[data-switch]").forEach(b=>b.onclick=()=>openAuth(b.dataset.switch));$("#authForm").onsubmit=async e=>{e.preventDefault();if(needConfig())return;const d=Object.fromEntries(new FormData(e.target));if(mode==="register"){if(d.password!==d.confirm)return toast("تکرار رمز عبور درست نیست.");const {data,error}=await sb.auth.signUp({email:d.email,password:d.password,options:{data:{full_name:d.full_name,username:d.username,phone:d.phone}}});if(error)return toast(error.message);if(data.user && !data.session){toast("حساب ساخته شد؛ ایمیل خود را تأیید کن.");}else toast("ثبت‌نام موفق بود.");}else{const {error}=await sb.auth.signInWithPassword({email:d.email,password:d.password});if(error)return toast("ورود ناموفق: "+error.message);toast("خوش آمدی!")} await refreshAuth();};}
async function refreshAuth(){
 if(!sb)return;
 const {data:{user}}=await sb.auth.getUser();currentUser=user;
 if(user){const {data}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();currentProfile=data;showDashboard();}
 else showPublic();
}
function showPublic(){$("#dashboardApp").classList.add("hidden");$("#publicApp").classList.remove("hidden");$(".topbar").classList.remove("hidden")}
function showDashboard(){$("#publicApp").classList.add("hidden");$(".topbar").classList.add("hidden");$("#dashboardApp").classList.remove("hidden");$("#userChip").textContent=currentProfile?.full_name||currentUser.email;document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",currentProfile?.role!=="admin"));openPage("overview")}
async function openProject(planId=""){
 if(!currentUser){openAuth("login");return}
 openPage("new-project",planId)
}
async function openPage(page,planId=""){
 if(!currentUser)return;
 const title={overview:"داشبورد",projects:"پروژه‌های من","new-project":"ثبت پروژه جدید",receipts:"رسیدهای پرداخت",tickets:"پشتیبانی",profile:"حساب کاربری",admin:"مدیریت"}[page]||"داشبورد";$("#dashTitle").textContent=title;
 if(page==="overview")return overview();
 if(page==="projects")return projects();
 if(page==="new-project")return newProject(planId);
 if(page==="receipts")return receipts();
 if(page==="tickets")return tickets();
 if(page==="profile")return profile();
 if(page==="admin")return admin();
}
async function overview(){
 const q=await sb.from("projects").select("*").eq("user_id",currentUser.id);
 const a=q.data||[];const count=s=>a.filter(x=>x.status===s).length;
 $("#pageContent").innerHTML=`<div class="grid dash-grid"><div class="card metric">کل پروژه‌ها<b>${a.length}</b></div><div class="card metric">در حال طراحی<b>${count("in_progress")}</b></div><div class="card metric">تکمیل‌شده<b>${count("completed")+count("delivered")}</b></div><div class="card metric">در انتظار پرداخت<b>${a.filter(x=>x.payment_status==="pending"||x.payment_status==="unpaid").length}</b></div></div><div class="card admin-section"><h3>آخرین پروژه‌ها</h3>${projectTable(a.slice(0,5))}</div>`;
}
function projectTable(a){return `<div class="table-wrap"><table class="table"><thead><tr><th>شماره</th><th>عنوان</th><th>قیمت</th><th>وضعیت</th></tr></thead><tbody>${a.map(x=>`<tr><td>${x.order_number}</td><td>${escapeHtml(x.title)}</td><td>${x.price?money(x.price):"-"}</td><td><span class="status">${statusFa[x.status]||x.status}</span></td></tr>`).join("")||"<tr><td colspan='4'>هنوز پروژه‌ای نداری.</td></tr>"}</tbody></table></div>`}
async function projects(){const {data}=await sb.from("projects").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});$("#pageContent").innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>پروژه‌های من</h3><button class="btn primary" id="quickProject">پروژه جدید</button></div>${projectTable(data||[])}</div>`;$("#quickProject").onclick=()=>openPage("new-project")}
async function newProject(planId){
 const {data:plans}=await sb.from("plans").select("*").order("sort_order");
 $("#pageContent").innerHTML=`<form id="projectForm" class="form card"><h3>اطلاعات پروژه</h3><div class="two"><input name="title" placeholder="عنوان پروژه" required><select name="site_type" required><option value="">نوع سایت</option><option>شخصی</option><option>شرکتی</option><option>فروشگاهی</option><option>اختصاصی</option><option>لندینگ پیج</option></select></div><select name="plan_id"><option value="">بدون انتخاب پلن</option>${(plans||[]).map(x=>`<option value="${x.id}" ${planId===x.id?"selected":""}>${escapeHtml(x.title)}</option>`).join("")}</select><div class="two"><input name="business_name" placeholder="نام کسب‌وکار"><input name="budget" placeholder="بودجه تقریبی"></div><textarea name="description" placeholder="توضیحات کامل پروژه" required></textarea><textarea name="required_features" placeholder="امکانات مورد نیاز"></textarea><input name="reference_sites" placeholder="سایت‌های مشابه یا لینک نمونه"><div class="two"><input name="color_preference" placeholder="رنگ‌بندی مورد علاقه"><input name="expected_time" placeholder="زمان مورد انتظار"></div><button class="btn primary">ثبت پروژه</button></form>`;
 $("#projectForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.user_id=currentUser.id;d.order_number="";const {error}=await sb.from("projects").insert(d);if(error)return toast(error.message);toast("پروژه با موفقیت ثبت شد.");openPage("projects")};
}
async function receipts(){
 const {data:projects}=await sb.from("projects").select("id,order_number,title").eq("user_id",currentUser.id);
 const {data:items}=await sb.from("payment_receipts").select("*,projects(order_number,title)").eq("user_id",currentUser.id).order("created_at",{ascending:false});
 $("#pageContent").innerHTML=`<div class="grid" style="grid-template-columns:1fr 1fr"><form id="receiptForm" class="form card"><h3>ارسال رسید پرداخت</h3><select name="project_id" required><option value="">انتخاب پروژه</option>${(projects||[]).map(p=>`<option value="${p.id}">${p.order_number} - ${escapeHtml(p.title)}</option>`).join("")}</select><input name="amount" type="number" placeholder="مبلغ پرداخت‌شده (تومان)" required><input name="paid_at" type="date" required><input name="tracking_code" placeholder="شماره پیگیری"><textarea name="description" placeholder="توضیحات"></textarea><input class="file-input" name="file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required><button class="btn primary">آپلود رسید</button><p class="note">رسید ابتدا در وضعیت «در انتظار بررسی» قرار می‌گیرد.</p></form><div class="card"><h3>رسیدهای من</h3>${(items||[]).map(x=>`<div style="padding:12px;border-bottom:1px solid #ffffff0d"><b>${x.projects?.order_number||""}</b><p>${money(x.amount)} • <span class="status">${statusFa[x.status]}</span></p>${x.reject_reason?`<p class="error">دلیل رد: ${escapeHtml(x.reject_reason)}</p>`:""}</div>`).join("")||"<p>هنوز رسیدی ارسال نکرده‌ای.</p>"}</div></div>`;
 $("#receiptForm").paid_at.value=new Date().toISOString().slice(0,10);
 $("#receiptForm").onsubmit=async e=>{e.preventDefault();const f=e.target;const d=new FormData(f);const file=d.get("file");if(file.size>8*1024*1024)return toast("حجم فایل باید کمتر از ۸ مگابایت باشد.");const path=`${currentUser.id}/${Date.now()}-${file.name}`;const up=await sb.storage.from("receipts").upload(path,file,{upsert:false});if(up.error)return toast(up.error.message);const {data:pub}=sb.storage.from("receipts").getPublicUrl(path);const row={project_id:d.get("project_id"),user_id:currentUser.id,amount:Number(d.get("amount")),paid_at:d.get("paid_at"),tracking_code:d.get("tracking_code"),description:d.get("description"),image_url:pub.publicUrl};const ins=await sb.from("payment_receipts").insert(row);if(ins.error)return toast(ins.error.message);toast("رسید ارسال شد.");receipts()};
}
async function tickets(){
 const {data}=await sb.from("tickets").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});
 $("#pageContent").innerHTML=`<div class="grid" style="grid-template-columns:1fr 1fr"><form id="ticketForm" class="form card"><h3>تیکت جدید</h3><input name="subject" placeholder="موضوع" required><textarea name="message" placeholder="پیام شما" required></textarea><button class="btn primary">ارسال تیکت</button></form><div class="card"><h3>تیکت‌های قبلی</h3>${(data||[]).map(x=>`<div style="padding:10px;border-bottom:1px solid #ffffff0d">${escapeHtml(x.subject)} <span class="status">${statusFa[x.status]}</span></div>`).join("")||"<p>تیکتی وجود ندارد.</p>"}</div></div>`;
 $("#ticketForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {data:t,error}=await sb.from("tickets").insert({user_id:currentUser.id,subject:d.subject}).select().single();if(error)return toast(error.message);const m=await sb.from("ticket_messages").insert({ticket_id:t.id,sender_id:currentUser.id,message:d.message});if(m.error)return toast(m.error.message);toast("تیکت ثبت شد.");tickets()};
}
async function profile(){$("#pageContent").innerHTML=`<form id="profileForm" class="form card"><h3>اطلاعات حساب</h3><input name="full_name" value="${escapeHtml(currentProfile?.full_name||"")}"><input name="username" value="${escapeHtml(currentProfile?.username||"")}"><input name="phone" value="${escapeHtml(currentProfile?.phone||"")}"><input disabled value="${escapeHtml(currentUser.email)}"><button class="btn primary">ذخیره تغییرات</button></form>`;$("#profileForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {error}=await sb.from("profiles").update(d).eq("id",currentUser.id);if(error)return toast(error.message);toast("ذخیره شد.");await refreshAuth()}}
async function admin(){
 if(currentProfile?.role!=="admin"){return $("#pageContent").innerHTML='<div class="card error">شما دسترسی مدیریت ندارید.</div>'}
 const [users,projectsQ,receiptsQ]=await Promise.all([sb.from("profiles").select("*"),sb.from("projects").select("*,profiles(full_name)"),sb.from("payment_receipts").select("*,profiles(full_name),projects(order_number,title)").order("created_at",{ascending:false})]);
 $("#pageContent").innerHTML=`<div class="grid dash-grid"><div class="card metric">کاربران<b>${users.data?.length||0}</b></div><div class="card metric">پروژه‌ها<b>${projectsQ.data?.length||0}</b></div><div class="card metric">رسیدها<b>${receiptsQ.data?.length||0}</b></div><div class="card metric">در انتظار<b>${(receiptsQ.data||[]).filter(x=>x.status==="pending").length}</b></div></div><div class="card admin-section"><h3>رسیدهای پرداخت</h3><div class="table-wrap"><table class="table"><thead><tr><th>کاربر</th><th>پروژه</th><th>مبلغ</th><th>فایل</th><th>عملیات</th></tr></thead><tbody>${(receiptsQ.data||[]).map(x=>`<tr><td>${escapeHtml(x.profiles?.full_name||"")}</td><td>${x.projects?.order_number||""}</td><td>${money(x.amount)}</td><td><a class="action" target="_blank" href="${x.image_url}">مشاهده</a></td><td>${x.status==="pending"?`<button class="action receipt-action" data-id="${x.id}" data-project="${x.project_id}" data-status="approved">تأیید</button> <button class="action receipt-action" data-id="${x.id}" data-project="${x.project_id}" data-status="rejected">رد</button>`:`<span class="status">${statusFa[x.status]}</span>`}</td></tr>`).join("")||"<tr><td colspan='5'>رسیدی نیست.</td></tr>"}</tbody></table></div></div><div class="card admin-section"><h3>آخرین پروژه‌ها</h3>${projectTable(projectsQ.data||[])}</div>`;
 document.querySelectorAll(".receipt-action").forEach(b=>b.onclick=async()=>{let reject_reason=null;if(b.dataset.status==="rejected"){reject_reason=prompt("دلیل رد رسید را وارد کن:");if(reject_reason===null)return}const {error}=await sb.from("payment_receipts").update({status:b.dataset.status,reject_reason}).eq("id",b.dataset.id);if(error)return toast(error.message);await sb.from("projects").update({payment_status:b.dataset.status==="approved"?"paid":"rejected",status:b.dataset.status==="approved"?"paid":"pending_payment"}).eq("id",b.dataset.project);toast("وضعیت رسید تغییر کرد.");admin()})}
document.addEventListener("click",e=>{if(e.target.matches("[data-open-auth]"))openAuth(e.target.dataset.openAuth);if(e.target.matches("[data-close]"))$("#authModal").classList.add("hidden");if(e.target.closest("[data-page]"))openPage(e.target.closest("[data-page]").dataset.page);if(e.target.id==="startProjectBtn"||e.target.id==="ctaProjectBtn")openProject();if(e.target.id==="logoutBtn"){sb.auth.signOut().then(refreshAuth)}});
$("#contactForm").onsubmit=async e=>{e.preventDefault();if(needConfig())return;const d=Object.fromEntries(new FormData(e.target));const {error}=await sb.from("contact_messages").insert(d);if(error)return toast(error.message);e.target.reset();toast("پیام شما ارسال شد.")};
$("#menuBtn").onclick=()=>{const n=$("#mainNav");n.style.display=n.style.display==="flex"?"none":"flex"};
if(sb){sb.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0))}
loadPublic();refreshAuth();
