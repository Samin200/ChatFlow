import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, FileWarning, KeyRound, LayoutDashboard, Mail, MessageSquare,
  Shield, UserPlus, Users, BarChart3, Flag, Settings, Lock, ClipboardList,
  Search, CheckCircle2, Clock, Trash2, Send, RefreshCw, TrendingUp, TrendingDown,
  Cpu, HardDrive, MemoryStick, Wifi, Eye, EyeOff, Plus, X, Copy, Check,
  AlertTriangle, Menu,
} from "lucide-react";
import ChatFlowIcon from "../components/ChatFlowIcon.jsx";
import { getAuthToken } from "../services/storageService.js";

const NAV_GROUPS = [
  { title: "Overview",    items: [{ key:"dashboard",     label:"Dashboard",     icon:LayoutDashboard }, { key:"analytics",     label:"Analytics",     icon:BarChart3    }] },
  { title: "Management",  items: [{ key:"users",         label:"Users",         icon:Users           }, { key:"chats",         label:"Chats",         icon:MessageSquare}, { key:"reports", label:"Reports", icon:Flag, badge:"reports" }, { key:"notifications", label:"Notifications", icon:Bell }] },
  { title: "Config",      items: [{ key:"permissions",   label:"Permissions",   icon:Shield          }, { key:"security",      label:"Security",      icon:Lock         }, { key:"smtp",    label:"Email/SMTP", icon:Mail }, { key:"api", label:"API Keys", icon:KeyRound }] },
  { title: "System",      items: [{ key:"settings",      label:"Settings",      icon:Settings        }, { key:"audit",         label:"Audit Log",     icon:ClipboardList}] },
];

const MESSAGES_PER_DAY  = [24, 38, 19, 42, 49, 31, 28];
const NEW_USERS_PER_DAY = [3, 5, 2, 7, 4, 6, 3];
const DAY_LABELS        = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const USER_GROWTH_DATA  = [12, 15, 17, 24, 28, 34, 37];

function normalizeList(payload, key) {
  if (Array.isArray(payload?.data))    return payload.data;
  if (Array.isArray(payload?.[key]))   return payload[key];
  return [];
}
function getStatus(user) {
  if (typeof user?.status === "string") return user.status;
  return user?.online === true ? "online" : "idle";
}
function evType(entry = {}) {
  const r = String(entry?.type ?? entry?.event ?? "").toLowerCase();
  if (r.includes("join") || r.includes("signup")) return "join";
  if (r.includes("report") || r.includes("warn"))  return "warning";
  if (r.includes("logout") || r.includes("offline"))return "logout";
  return "message";
}
function initials(name) {
  const p = String(name ?? "?").trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : String(name??"?").slice(0,2).toUpperCase();
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Skeleton({ h="1rem", w="100%", radius="6px" }) {
  return <div style={{ height:h, width:w, borderRadius:radius, background:"color-mix(in srgb,var(--color-text) 8%,transparent)", animation:"pulse 1.6s ease-in-out infinite" }} />;
}

function Toast({ message, color, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg mt-4"
      style={{ background:`color-mix(in srgb,${color} 15%,transparent)`, color }}>
      <CheckCircle2 className="h-4 w-4 shrink-0" /><span className="text-sm">{message}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-xs mt-0.5" style={{ color:"color-mix(in srgb,var(--color-text) 55%,transparent)" }}>{subtitle}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border"
      style={{ background:"color-mix(in srgb,var(--color-surface) 92%,var(--color-background) 8%)", borderColor:"color-mix(in srgb,var(--color-text) 10%,transparent)" }}>
      <Icon className="h-10 w-10" style={{ color:"color-mix(in srgb,var(--color-text) 32%,transparent)" }} />
      <p className="text-sm" style={{ color:"color-mix(in srgb,var(--color-text) 32%,transparent)" }}>{message}</p>
    </div>
  );
}

function BarChart({ data, labels, color, accent, height=160 }) {
  const [hov, setHov] = useState(null);
  const max = Math.max(...data, 1);
  return (
    <div style={{ position:"relative" }}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((v, i) => {
          const pct = Math.max(6, Math.round((v/max)*100));
          return (
            <div key={labels[i]} className="flex-1 flex flex-col items-center gap-1.5" style={{ height:"100%" }}>
              <div className="flex-1 w-full flex items-end relative">
                {hov===i && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none"
                    style={{ background:"color-mix(in srgb,var(--color-surface) 95%,transparent)", color:"var(--color-text)", border:"0.5px solid color-mix(in srgb,var(--color-text) 15%,transparent)" }}>
                    {v}
                  </div>
                )}
                <div className="w-full rounded-t-md cursor-pointer"
                  style={{ height:`${pct}%`, minHeight:6, background:hov===i?accent:color, opacity:hov!==null&&hov!==i?0.5:1, transition:"opacity 0.15s,background 0.15s" }}
                  onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} />
              </div>
              <span className="text-[10px]" style={{ color:"color-mix(in srgb,var(--color-text) 32%,transparent)" }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ data, labels, color }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v,i) => [(i/(data.length-1))*100, 100-(v/max)*85-5]);
  const poly = pts.map(([x,y])=>`${x},${y}`).join(" ");
  const area = `${pts[0][0]},100 ${poly} ${pts[pts.length-1][0]},100`;
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width:"100%", height:160 }}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#lg)" />
        <polyline fill="none" stroke={color} strokeWidth="2" points={poly} />
        {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="2.5" fill={color} />)}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map(l => <span key={l} className="text-[10px]" style={{ color:"color-mix(in srgb,var(--color-text) 32%,transparent)" }}>{l}</span>)}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, accent }) {
  return (
    <button onClick={()=>onChange(!checked)} style={{ width:36, height:20, borderRadius:10, padding:2, background:checked?accent:"color-mix(in srgb,var(--color-text) 12%,transparent)", border:"none", cursor:"pointer", transition:"background 0.2s", display:"flex", alignItems:"center" }}>
      <div style={{ width:16, height:16, borderRadius:"50%", background:"white", transform:checked?"translateX(16px)":"translateX(0)", transition:"transform 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function RoleBadge({ role, c }) {
  const color = role==="admin"?c.accent : role==="moderator"?c.info : c.textMuted;
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ background:`color-mix(in srgb,${color} 15%,transparent)`, color }}>{role??"member"}</span>;
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr style={{ background:"color-mix(in srgb,var(--color-surface) 82%,var(--color-background) 18%)" }}>
        {cols.map(h => <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color:"color-mix(in srgb,var(--color-text) 55%,transparent)" }}>{h}</th>)}
      </tr>
    </thead>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ══════════════════════════════════════════════════════════════════════════════

function DashboardView({ c, loading, users, chats, requests, activityFeed, statCards, filteredUsers, userSearch, setUserSearch, pendingRequests, resolvedRequests, healthItems, markResolved, deleteUser, messageUser, resolving, deleting, dotColor }) {
  const maxBar = Math.max(...MESSAGES_PER_DAY, 1);
  return (
    <>
      <SectionHeader title="Admin Dashboard" subtitle="Monitor users, chats, reports, and system operations">
        <button className="h-8 px-3 rounded-lg text-xs border admin-card-btn" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}>Export CSV</button>
        <button className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 admin-card-btn" style={{ background:c.accent, color:c.accentFg }}><UserPlus className="h-3.5 w-3.5"/>Invite User</button>
      </SectionHeader>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {statCards.map(card=>{const Icon=card.icon;return(
          <article key={card.label} className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px]" style={{ color:c.textMuted }}>{card.label}</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background:`color-mix(in srgb,${c.accent} 12%,transparent)` }}><Icon className="h-3.5 w-3.5" style={{ color:c.accent }}/></div>
            </div>
            {loading?<Skeleton h="28px" w="60px"/>:<p className="text-2xl font-semibold leading-tight">{card.value}</p>}
            <div className="flex items-center gap-1 mt-1.5">
              {card.positive?<TrendingUp className="h-3 w-3" style={{ color:c.success }}/>:<TrendingDown className="h-3 w-3" style={{ color:c.danger }}/>}
              <p className="text-[11px]" style={{ color:card.positive?c.success:c.danger }}>{card.delta} this week</p>
            </div>
          </article>
        );})}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-5">
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
          {loading?<div className="space-y-2">{[1,2,3,4].map(i=><Skeleton key={i} h="44px" radius="10px"/>)}</div>
            :activityFeed.length===0?<div className="flex flex-col items-center py-8 gap-2"><Activity className="h-8 w-8" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>No recent activity</p></div>
            :<div className="space-y-1.5 max-h-[260px] overflow-y-auto admin-scroll pr-1">
              {activityFeed.map(entry=>{const type=evType(entry);return(
                <div key={entry.id} className="admin-row rounded-lg border px-3 py-2 flex items-start gap-2.5" style={{ borderColor:c.border, background:c.bgSubtle }}>
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background:dotColor(type) }}/>
                  <div className="min-w-0 flex-1"><p className="text-[13px] leading-snug">{entry.text}</p><p className="text-[11px] mt-0.5" style={{ color:c.textFaint }}>{entry.at}</p></div>
                </div>
              );})}
            </div>}
        </article>
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Online Now</h2>
            {!loading&&<span className="text-xs px-2 py-0.5 rounded-full" style={{ background:`color-mix(in srgb,${c.success} 15%,transparent)`, color:c.success }}>{users.filter(u=>getStatus(u)==="online").length} online</span>}
          </div>
          {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="44px" radius="10px"/>)}</div>
            :users.length===0?<div className="flex flex-col items-center py-8 gap-2"><Users className="h-8 w-8" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>No users found</p></div>
            :<div className="space-y-1.5 max-h-[260px] overflow-y-auto admin-scroll pr-1">
              {users.slice(0,12).map(user=>{const st=getStatus(user);return(
                <button key={user.id??user._id??user.username} onClick={()=>messageUser(user.id??user._id)} className="admin-row w-full rounded-lg border px-3 py-2 flex items-center justify-between text-left" style={{ borderColor:c.border, background:c.bgSubtle }}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background:c.accent, color:c.accentFg }}>{initials(user.displayName??user.username)}</span>
                    <span className="min-w-0"><span className="block text-[13px] truncate font-medium">{user.displayName??user.username}</span><span className="block text-[11px]" style={{ color:c.textFaint }}>@{user.username}·{user.role??"member"}</span></span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] shrink-0" style={{ color:c.textFaint }}><span className="h-2 w-2 rounded-full" style={{ background:st==="online"?c.success:c.warning }}/>{st}</span>
                </button>
              );})}
            </div>}
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-5">
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold">Messages / Day</h2><span className="text-[11px]" style={{ color:c.textFaint }}>This week</span></div>
          <BarChart data={MESSAGES_PER_DAY} labels={DAY_LABELS} height={120} color={`color-mix(in srgb,${c.info} 35%,transparent)`} accent={c.accent}/>
          <div className="mt-3 pt-3 border-t flex justify-between" style={{ borderColor:c.border }}>
            <span className="text-[11px]" style={{ color:c.textFaint }}>Total: {MESSAGES_PER_DAY.reduce((a,b)=>a+b,0)}</span>
            <span className="text-[11px]" style={{ color:c.textFaint }}>Peak: {maxBar} on {DAY_LABELS[MESSAGES_PER_DAY.indexOf(maxBar)]}</span>
          </div>
        </article>
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <h2 className="text-sm font-semibold mb-3">Quick Reports</h2>
          <div className="space-y-2">
            {[{icon:FileWarning,label:"Open user reports",count:requests.length,color:c.danger},{icon:Activity,label:"Audit events today",count:chats.length*3,color:c.info},{icon:Bell,label:"Pending notifications",count:users.length,color:c.warning},{icon:CheckCircle2,label:"Resolved requests",count:resolvedRequests.length,color:c.success}].map(item=>{const Icon=item.icon;return(
              <div key={item.label} className="admin-row rounded-lg border px-3 py-2.5 flex items-center justify-between" style={{ borderColor:c.border, background:c.bgSubtle }}>
                <span className="flex items-center gap-2 text-[13px]"><div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background:`color-mix(in srgb,${item.color} 12%,transparent)` }}><Icon className="h-3.5 w-3.5" style={{ color:item.color }}/></div>{item.label}</span>
                <span className="text-sm font-semibold" style={{ color:item.color }}>{loading?"—":item.count}</span>
              </div>
            );})}
          </div>
        </article>
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <h2 className="text-sm font-semibold mb-3">System Health</h2>
          <div className="space-y-3.5">
            {healthItems.map(item=>{const Icon=item.icon;return(
              <div key={item.label}>
                <div className="flex items-center justify-between text-[12px] mb-1.5"><span className="flex items-center gap-1.5" style={{ color:c.textMuted }}><Icon className="h-3.5 w-3.5"/>{item.label}</span><span className="font-medium">{item.value}%</span></div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:c.bgSubtle }}><div style={{ width:`${item.value}%`, background:item.color, height:"100%", borderRadius:4, transition:"width 0.6s ease" }}/></div>
              </div>
            );})}
          </div>
          <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor:c.border }}><div className="h-2 w-2 rounded-full" style={{ background:c.success }}/><span className="text-[11px]" style={{ color:c.textFaint }}>All systems operational</span></div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Users</h2><span className="text-[11px]" style={{ color:c.textFaint }}>{loading?"—":`${filteredUsers.length} of ${users.length}`}</span></div>
          <div className="relative mb-3"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:c.textFaint }}/><input type="text" placeholder="Search users..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 rounded-lg border text-[13px] outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}/></div>
          {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="64px" radius="10px"/>)}</div>
            :filteredUsers.length===0?<div className="flex flex-col items-center py-8 gap-2"><Users className="h-8 w-8" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>{userSearch?"No match":"No users yet"}</p></div>
            :<div className="space-y-1.5 max-h-[280px] overflow-y-auto admin-scroll pr-1">
              {filteredUsers.map(user=>{const uid=user.id??user._id;const isDel=deleting===uid;return(
                <div key={uid??user.username} className="rounded-lg border px-3 py-2.5" style={{ borderColor:c.border, background:c.bgSubtle }}>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background:c.accent, color:c.accentFg }}>{initials(user.displayName??user.username)}</div>
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-medium truncate">{user.displayName??user.username}</p><p className="text-[11px]" style={{ color:c.textFaint }}>@{user.username}{user.role?` · ${user.role}`:""}</p></div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={()=>messageUser(uid)} className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 admin-card-btn" style={{ background:c.accent, color:c.accentFg }}><Send className="h-3 w-3"/>Msg</button>
                      <button onClick={()=>deleteUser(uid)} disabled={isDel} className="h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 admin-card-btn border" style={{ borderColor:`color-mix(in srgb,${c.danger} 40%,transparent)`, color:c.danger, opacity:isDel?0.5:1 }}><Trash2 className="h-3 w-3"/>{isDel?"...":"Del"}</button>
                    </div>
                  </div>
                </div>
              );})}
            </div>}
        </article>
        <article className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Forgot Password Requests</h2>{!loading&&pendingRequests.length>0&&<span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background:`color-mix(in srgb,${c.warning} 15%,transparent)`, color:c.warning }}>{pendingRequests.length} pending</span>}</div>
          {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="64px" radius="10px"/>)}</div>
            :requests.length===0?<div className="flex flex-col items-center py-8 gap-2"><CheckCircle2 className="h-8 w-8" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>No password requests</p></div>
            :<div className="space-y-1.5 max-h-[280px] overflow-y-auto admin-scroll pr-1">
              {requests.map(req=>{const rid=req.id??req._id;const isRes=req.resolved||req.isResolved;const isRing=resolving===rid;return(
                <div key={rid} className="rounded-lg border px-3 py-2.5" style={{ borderColor:c.border, background:c.bgSubtle }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="text-[13px] font-medium">@{req.username}</p><span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background:isRes?`color-mix(in srgb,${c.success} 15%,transparent)`:`color-mix(in srgb,${c.warning} 15%,transparent)`, color:isRes?c.success:c.warning }}>{isRes?"Resolved":"Pending"}</span></div>
                      {req.whatsapp&&<p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color:c.textFaint }}><Clock className="h-3 w-3"/>WhatsApp: {req.whatsapp}</p>}
                    </div>
                    {!isRes&&<button onClick={()=>markResolved(rid)} disabled={isRing} className="h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 shrink-0 admin-card-btn" style={{ background:c.accent, color:c.accentFg, opacity:isRing?0.6:1 }}><CheckCircle2 className="h-3 w-3"/>{isRing?"...":"Resolve"}</button>}
                  </div>
                </div>
              );})}
            </div>}
        </article>
      </section>
    </>
  );
}

function AnalyticsView({ c, loading }) {
  const total=MESSAGES_PER_DAY.reduce((a,b)=>a+b,0), avg=Math.round(total/MESSAGES_PER_DAY.length), max=Math.max(...MESSAGES_PER_DAY,1), busiest=DAY_LABELS[MESSAGES_PER_DAY.indexOf(max)];
  return (
    <>
      <SectionHeader title="Analytics" subtitle="Track platform metrics, user growth, and engagement trends"/>
      <section className="grid grid-cols-3 gap-3 mb-5">
        {[{label:"Total Messages",value:total,note:"this week"},{label:"Avg / Day",value:avg,note:"messages"},{label:"Busiest Day",value:busiest,note:"highest traffic"}].map(s=>(
          <article key={s.label} className="rounded-xl border p-4" style={{ background:c.bgPanel, borderColor:c.border }}>
            <p className="text-[11px] mb-1" style={{ color:c.textMuted }}>{s.label}</p>
            {loading?<Skeleton h="28px" w="60px"/>:<p className="text-2xl font-semibold">{s.value}</p>}
            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color:c.success }}><TrendingUp className="h-3 w-3"/>{s.note}</p>
          </article>
        ))}
      </section>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold">Messages / Day</h2><span className="text-[11px]" style={{ color:c.textFaint }}>Hover bars for values</span></div>
        <BarChart data={MESSAGES_PER_DAY} labels={DAY_LABELS} height={180} color={`color-mix(in srgb,${c.info} 40%,transparent)`} accent={c.accent}/>
      </section>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold">New Users / Day</h2><span className="text-[11px]" style={{ color:c.textFaint }}>This week</span></div>
        <BarChart data={NEW_USERS_PER_DAY} labels={DAY_LABELS} height={140} color={`color-mix(in srgb,${c.success} 45%,transparent)`} accent={c.success}/>
      </section>
      <section className="rounded-xl border p-5" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold">User Growth</h2><span className="text-[11px]" style={{ color:c.textFaint }}>Cumulative</span></div>
        <LineChart data={USER_GROWTH_DATA} labels={DAY_LABELS} color={c.accent}/>
      </section>
    </>
  );
}

function UsersView({ c, loading, users, deleteUser, messageUser, deleting }) {
  const [search,setSearch]=useState(""), [role,setRole]=useState("all");
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();let r=users;if(q)r=r.filter(u=>(u.displayName??"").toLowerCase().includes(q)||(u.username??"").toLowerCase().includes(q));if(role!=="all")r=r.filter(u=>(u.role??"member")===role);return r;},[users,search,role]);
  return (
    <>
      <SectionHeader title="Users" subtitle="Manage user accounts, roles, and permissions"><span className="text-[11px]" style={{ color:c.textFaint }}>{loading?"—":`${filtered.length} of ${users.length}`}</span></SectionHeader>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:c.textFaint }}/><input type="text" placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none" style={{ background:c.bgPanel, borderColor:c.border, color:c.text }}/></div>
        <select value={role} onChange={e=>setRole(e.target.value)} className="h-9 px-3 rounded-lg border text-sm outline-none" style={{ background:c.bgPanel, borderColor:c.border, color:c.text }}><option value="all">All Roles</option><option value="admin">Admin</option><option value="moderator">Moderator</option><option value="member">Member</option></select>
      </div>
      {loading?<div className="space-y-2">{[1,2,3,4].map(i=><Skeleton key={i} h="60px" radius="10px"/>)}</div>
        :filtered.length===0?<EmptyState icon={Users} message={search?"No users match":"No users yet"}/>
        :<div className="rounded-xl border overflow-hidden" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="overflow-x-auto"><table className="w-full text-left" style={{ tableLayout:"fixed", minWidth:600 }}>
            <TableHead cols={["User","Role","Joined","Status","Actions"]}/>
            <tbody>
              {filtered.map(user=>{const uid=user.id??user._id;const st=getStatus(user);const isDel=deleting===uid;return(
                <tr key={uid??user.username} className="admin-row border-t" style={{ borderColor:c.border }}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background:c.accent, color:c.accentFg }}>{initials(user.displayName??user.username)}</div><div className="min-w-0"><p className="text-sm font-medium truncate">{user.displayName??user.username}</p><p className="text-xs truncate" style={{ color:c.textFaint }}>@{user.username}</p></div></div></td>
                  <td className="px-4 py-3"><RoleBadge role={user.role??"member"} c={c}/></td>
                  <td className="px-4 py-3 text-sm" style={{ color:c.textMuted }}>{user.createdAt?new Date(user.createdAt).toLocaleDateString():"—"}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background:st==="online"?c.success:c.warning }}/><span className="text-sm capitalize" style={{ color:c.textMuted }}>{st}</span></div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><button onClick={()=>messageUser(uid)} className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 admin-card-btn" style={{ background:c.accent, color:c.accentFg }}><Send className="h-3 w-3"/>Msg</button><button onClick={()=>deleteUser(uid)} disabled={isDel} className="h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 admin-card-btn border" style={{ borderColor:`color-mix(in srgb,${c.danger} 40%,transparent)`, color:c.danger, opacity:isDel?0.5:1 }}><Trash2 className="h-3 w-3"/>{isDel?"...":"Del"}</button></div></td>
                </tr>
              );})}
            </tbody>
          </table></div>
        </div>}
    </>
  );
}

function ChatsView({ c, loading, chats, onOpenChat, onClose }) {
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?chats.filter(ch=>(ch.name??"").toLowerCase().includes(q)):chats;},[chats,search]);
  return (
    <>
      <SectionHeader title="Chats" subtitle="View and manage all chat conversations"><span className="text-[11px]" style={{ color:c.textFaint }}>{loading?"—":`${chats.length} total`}</span></SectionHeader>
      <div className="relative mb-4"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:c.textFaint }}/><input type="text" placeholder="Search chats..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none" style={{ background:c.bgPanel, borderColor:c.border, color:c.text }}/></div>
      {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="60px" radius="10px"/>)}</div>
        :filtered.length===0?<EmptyState icon={MessageSquare} message={search?"No chats match":"No chats yet"}/>
        :<div className="rounded-xl border overflow-hidden" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="overflow-x-auto"><table className="w-full text-left" style={{ minWidth:580 }}>
            <TableHead cols={["Chat","Type","Participants","Created","Status","Action"]}/>
            <tbody>
              {filtered.map(chat=>{const cid=chat.id??chat._id;const isDirect=chat.type==="direct"||!chat.name;return(
                <tr key={cid} className="admin-row border-t" style={{ borderColor:c.border }}>
                  <td className="px-4 py-3 text-sm font-medium truncate max-w-[160px]">{chat.name||"Direct chat"}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background:`color-mix(in srgb,${isDirect?c.info:c.accent} 15%,transparent)`, color:isDirect?c.info:c.accent }}>{isDirect?"Direct":"Group"}</span></td>
                  <td className="px-4 py-3 text-sm" style={{ color:c.textMuted }}>{chat.participants?.length??2}</td>
                  <td className="px-4 py-3 text-sm" style={{ color:c.textMuted }}>{chat.createdAt?new Date(chat.createdAt).toLocaleDateString():"—"}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background:chat.active!==false?c.success:c.textFaint }}/><span className="text-sm" style={{ color:c.textMuted }}>{chat.active!==false?"Active":"Inactive"}</span></div></td>
                  <td className="px-4 py-3"><button onClick={()=>{onClose?.();onOpenChat?.(cid);}} className="h-7 px-3 rounded-md text-[11px] font-semibold admin-card-btn" style={{ background:c.accent, color:c.accentFg }}>Open</button></td>
                </tr>
              );})}
            </tbody>
          </table></div>
        </div>}
    </>
  );
}

function ReportsView({ c, loading, requests, markResolved, resolving }) {
  const [tab,setTab]=useState("pending");
  const pending=useMemo(()=>requests.filter(r=>!r.resolved&&!r.isResolved),[requests]);
  const resolved=useMemo(()=>requests.filter(r=>r.resolved||r.isResolved),[requests]);
  const list=tab==="pending"?pending:resolved;
  return (
    <>
      <SectionHeader title="Reports" subtitle="Manage password reset requests and user reports"/>
      <div className="flex gap-2 mb-5">
        {[{key:"pending",label:"Pending",count:pending.length},{key:"resolved",label:"Resolved",count:resolved.length}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className="h-9 px-4 rounded-lg text-sm font-medium border" style={{ background:tab===t.key?c.accent:c.bgPanel, color:tab===t.key?c.accentFg:c.text, borderColor:tab===t.key?c.accent:c.border }}>{t.label} ({t.count})</button>
        ))}
      </div>
      {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="80px" radius="10px"/>)}</div>
        :list.length===0?<EmptyState icon={CheckCircle2} message={tab==="pending"?"No pending requests":"No resolved requests"}/>
        :<div className="space-y-2">
          {list.map(req=>{const rid=req.id??req._id;const isRes=req.resolved||req.isResolved;const isRing=resolving===rid;return(
            <div key={rid} className="rounded-xl border px-4 py-4" style={{ borderColor:c.border, background:c.bgPanel }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1"><p className="text-sm font-medium">@{req.username}</p><span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background:isRes?`color-mix(in srgb,${c.success} 15%,transparent)`:`color-mix(in srgb,${c.warning} 15%,transparent)`, color:isRes?c.success:c.warning }}>{isRes?"Resolved":"Pending"}</span></div>
                  {req.whatsapp&&<p className="text-xs flex items-center gap-1 mb-1" style={{ color:c.textFaint }}><Clock className="h-3.5 w-3.5"/>WhatsApp: {req.whatsapp}</p>}
                  <p className="text-xs" style={{ color:c.textFaint }}>{req.createdAt?new Date(req.createdAt).toLocaleString():"Unknown date"}</p>
                </div>
                {!isRes&&<button onClick={()=>markResolved(rid)} disabled={isRing} className="h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 admin-card-btn" style={{ background:c.accent, color:c.accentFg, opacity:isRing?0.6:1 }}><CheckCircle2 className="h-3.5 w-3.5"/>{isRing?"Resolving...":"Resolve"}</button>}
              </div>
            </div>
          );})}
        </div>}
    </>
  );
}

function NotificationsView({ c, loading, activityFeed }) {
  const [prefs,setPrefs]=useState({signup:true,report:true,alert:false,digest:false});
  const toggle=k=>setPrefs(p=>({...p,[k]:!p[k]}));
  return (
    <>
      <SectionHeader title="Notifications" subtitle="Configure notification preferences and view recent alerts"/>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-4">Email Notifications</h2>
        <div className="space-y-1">
          {[{key:"signup",label:"New user signup",desc:"Notify when a new user registers"},{key:"report",label:"Report flagged",desc:"Alert when a user is reported"},{key:"alert",label:"System alert",desc:"Critical system health notifications"},{key:"digest",label:"Daily digest",desc:"Summary of daily platform activity"}].map(item=>(
            <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor:c.border }}>
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs mt-0.5" style={{ color:c.textFaint }}>{item.desc}</p></div>
              <Toggle checked={prefs[item.key]} onChange={()=>toggle(item.key)} accent={c.accent}/>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border p-5" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-4">Recent Notifications</h2>
        {loading?<div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} h="50px" radius="10px"/>)}</div>
          :activityFeed.length===0?<div className="flex flex-col items-center py-10 gap-2"><Bell className="h-8 w-8" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>No recent notifications</p></div>
          :<div className="space-y-2">{activityFeed.slice(0,6).map(entry=>(
            <div key={entry.id} className="rounded-lg border px-3 py-3 flex items-start gap-3" style={{ borderColor:c.border, background:c.bgSubtle }}>
              <Bell className="h-4 w-4 mt-0.5 shrink-0" style={{ color:c.info }}/><div className="min-w-0 flex-1"><p className="text-sm">{entry.text}</p><p className="text-xs mt-1" style={{ color:c.textFaint }}>{entry.at}</p></div>
            </div>
          ))}</div>}
      </section>
    </>
  );
}

function PermissionsView({ c }) {
  const perms={admin:{viewUsers:true,deleteUser:true,manageChats:true,viewReports:true,resolveReports:true,manageAPI:true,accessSettings:true},moderator:{viewUsers:true,deleteUser:false,manageChats:true,viewReports:true,resolveReports:true,manageAPI:false,accessSettings:false},member:{viewUsers:false,deleteUser:false,manageChats:false,viewReports:false,resolveReports:false,manageAPI:false,accessSettings:false}};
  const cols=[{key:"viewUsers",label:"View Users"},{key:"deleteUser",label:"Delete Users"},{key:"manageChats",label:"Manage Chats"},{key:"viewReports",label:"View Reports"},{key:"resolveReports",label:"Resolve Reports"},{key:"manageAPI",label:"Manage API"},{key:"accessSettings",label:"Settings"}];
  return (
    <>
      <SectionHeader title="Permissions" subtitle="Role-based access control matrix"/>
      <div className="rounded-xl border overflow-hidden" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="overflow-x-auto"><table className="w-full text-left" style={{ minWidth:640 }}>
          <thead><tr style={{ background:c.bgSubtle }}><th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color:c.textMuted }}>Role</th>{cols.map(col=><th key={col.key} className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-center" style={{ color:c.textMuted }}>{col.label}</th>)}</tr></thead>
          <tbody>{["admin","moderator","member"].map(role=><tr key={role} className="border-t" style={{ borderColor:c.border }}><td className="px-4 py-3"><RoleBadge role={role} c={c}/></td>{cols.map(col=><td key={col.key} className="px-3 py-3 text-center">{perms[role][col.key]?<CheckCircle2 className="h-4 w-4 inline" style={{ color:c.success }}/>:<X className="h-4 w-4 inline" style={{ color:c.textFaint }}/>}</td>)}</tr>)}</tbody>
        </table></div>
      </div>
      <p className="text-xs mt-3" style={{ color:c.textFaint }}>Read-only. Contact your system administrator to modify role permissions.</p>
    </>
  );
}

function SecurityView({ c, loading, users }) {
  const attempts=[{username:"john_doe",ip:"192.168.1.105",time:"2m ago",ok:true},{username:"jane_smith",ip:"10.0.0.42",time:"15m ago",ok:true},{username:"unknown",ip:"203.0.113.50",time:"1h ago",ok:false},{username:"admin_user",ip:"192.168.1.200",time:"2h ago",ok:true},{username:"test_account",ip:"198.51.100.23",time:"3h ago",ok:false}];
  const locked=users.filter(u=>u.locked===true);
  return (
    <>
      <SectionHeader title="Security" subtitle="Monitor login attempts and manage security settings"/>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-4">Recent Login Attempts</h2>
        <div className="space-y-1">
          {attempts.map((a,i)=>(
            <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor:c.border }}>
              <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background:`color-mix(in srgb,${a.ok?c.success:c.danger} 12%,transparent)` }}><Lock className="h-3.5 w-3.5" style={{ color:a.ok?c.success:c.danger }}/></div><div><p className="text-sm font-medium">@{a.username}</p><p className="text-xs" style={{ color:c.textFaint }}>{a.ip}</p></div></div>
              <div className="flex items-center gap-3"><span className="text-xs" style={{ color:c.textFaint }}>{a.time}</span><span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background:`color-mix(in srgb,${a.ok?c.success:c.danger} 15%,transparent)`, color:a.ok?c.success:c.danger }}>{a.ok?"Success":"Failed"}</span></div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-4">Locked Accounts</h2>
        {loading?<div className="space-y-2">{[1,2].map(i=><Skeleton key={i} h="40px" radius="8px"/>)}</div>
          :locked.length===0?<div className="flex flex-col items-center py-8 gap-2"><CheckCircle2 className="h-7 w-7" style={{ color:c.textFaint }}/><p className="text-sm" style={{ color:c.textFaint }}>No locked accounts</p></div>
          :<div className="space-y-2">{locked.map(u=><div key={u.id??u._id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor:c.border }}><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background:c.accent, color:c.accentFg }}>{initials(u.displayName??u.username)}</div><div><p className="text-sm font-medium">@{u.username}</p><p className="text-xs" style={{ color:c.textFaint }}>Locked for suspicious activity</p></div></div><button className="h-7 px-3 rounded-md text-xs font-semibold border admin-card-btn" style={{ borderColor:c.border, color:c.text }}>Unlock</button></div>)}</div>}
      </section>
      <section className="rounded-xl border p-5" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Two-Factor Authentication</h2><p className="text-xs mt-1" style={{ color:c.textFaint }}>Enforcement: <span style={{ color:c.danger }}>Disabled</span> — enabling is recommended</p></div><button className="h-8 px-4 rounded-lg text-sm font-semibold admin-card-btn" style={{ background:c.accent, color:c.accentFg }}>Enable</button></div>
      </section>
    </>
  );
}

function SMTPView({ c }) {
  const [showPass,setShowPass]=useState(false), [toast,setToast]=useState(false);
  const [form,setForm]=useState({host:"",port:"587",user:"",pass:"",from:"",tls:true});
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value}));
  return (
    <>
      <SectionHeader title="Email / SMTP" subtitle="Configure outgoing email server settings"/>
      <div className="rounded-xl border p-5" style={{ background:c.bgPanel, borderColor:c.border }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {[{label:"SMTP Host",key:"host",type:"text",ph:"smtp.example.com"},{label:"Port",key:"port",type:"number",ph:"587"},{label:"Username",key:"user",type:"text",ph:"smtp-username"},{label:"From Email",key:"from",type:"email",ph:"noreply@example.com"}].map(f=>(
            <div key={f.key}><label className="block text-xs font-medium mb-1.5" style={{ color:c.textMuted }}>{f.label}</label><input type={f.type} value={form[f.key]} onChange={set(f.key)} placeholder={f.ph} className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}/></div>
          ))}
          <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1.5" style={{ color:c.textMuted }}>Password</label><div className="relative"><input type={showPass?"text":"password"} value={form.pass} onChange={set("pass")} placeholder="••••••••" className="w-full h-9 pl-3 pr-10 rounded-lg border text-sm outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}/><button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", color:c.textMuted }}>{showPass?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>
        </div>
        <label className="flex items-center gap-2 mb-6 cursor-pointer"><input type="checkbox" checked={form.tls} onChange={set("tls")} className="h-4 w-4 rounded" style={{ accentColor:c.accent }}/><span className="text-sm">Use TLS encryption</span></label>
        <div className="flex items-center gap-3">
          <button onClick={()=>setToast(true)} className="h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 admin-card-btn" style={{ background:c.accent, color:c.accentFg }}><Mail className="h-4 w-4"/>Send Test Email</button>
          <button className="h-9 px-4 rounded-lg text-sm font-semibold border admin-card-btn" style={{ borderColor:c.border, color:c.text }}>Save Settings</button>
        </div>
        {toast&&<Toast message="Test email sent successfully!" color={c.success} onDone={()=>setToast(false)}/>}
      </div>
    </>
  );
}

function APIKeysView({ c }) {
  const [keys,setKeys]=useState([{id:"1",name:"Production Key",value:"sk-prod-abc123def456ghi789jkl012mno345pqr",created:"2024-01-15",lastUsed:"2m ago",revealed:false},{id:"2",name:"Staging Key",value:"sk-stg-xyz987wvu654tsr321qpo098nml765abc",created:"2024-02-20",lastUsed:"1d ago",revealed:false}]);
  const [copied,setCopied]=useState(null);
  const mask=v=>`${v.slice(0,8)}••••••••••••${v.slice(-4)}`;
  const toggle=id=>setKeys(ks=>ks.map(k=>k.id===id?{...k,revealed:!k.revealed}:k));
  const revoke=id=>{if(window.confirm("Revoke this key?"))setKeys(ks=>ks.filter(k=>k.id!==id));};
  const copy=(id,v)=>{navigator.clipboard.writeText(v).catch(()=>{});setCopied(id);setTimeout(()=>setCopied(null),2000);};
  const gen=()=>setKeys(ks=>[{id:Date.now().toString(),name:`Key ${ks.length+1}`,value:`sk-new-${Math.random().toString(36).slice(2,10)}${Math.random().toString(36).slice(2,18)}`,created:new Date().toISOString().split("T")[0],lastUsed:"Never",revealed:false},...ks]);
  return (
    <>
      <SectionHeader title="API Keys" subtitle="Manage API access keys for integrations"><button onClick={gen} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 admin-card-btn" style={{ background:c.accent, color:c.accentFg }}><Plus className="h-3.5 w-3.5"/>Generate New Key</button></SectionHeader>
      {keys.length===0?<EmptyState icon={KeyRound} message="No API keys generated yet"/>
        :<div className="space-y-3">{keys.map(key=>(
          <div key={key.id} className="rounded-xl border p-4" style={{ borderColor:c.border, background:c.bgPanel }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium mb-2">{key.name}</p>
                <div className="flex items-center gap-2 flex-wrap"><code className="text-xs px-2.5 py-1 rounded-md font-mono" style={{ background:c.bgSubtle, color:c.textMuted }}>{key.revealed?key.value:mask(key.value)}</code><button onClick={()=>copy(key.id,key.value)} className="h-6 w-6 rounded flex items-center justify-center admin-card-btn" style={{ background:c.bgSubtle, color:c.textMuted }}>{copied===key.id?<Check className="h-3 w-3" style={{ color:c.success }}/>:<Copy className="h-3 w-3"/>}</button></div>
                <div className="flex gap-4 mt-2"><span className="text-xs" style={{ color:c.textFaint }}>Created: {key.created}</span><span className="text-xs" style={{ color:c.textFaint }}>Last used: {key.lastUsed}</span></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={()=>toggle(key.id)} className="h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 admin-card-btn border" style={{ borderColor:c.border, color:c.textMuted }}>{key.revealed?<><EyeOff className="h-3 w-3"/>Hide</>:<><Eye className="h-3 w-3"/>Reveal</>}</button>
                <button onClick={()=>revoke(key.id)} className="h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 admin-card-btn border" style={{ borderColor:`color-mix(in srgb,${c.danger} 40%,transparent)`, color:c.danger }}><X className="h-3 w-3"/>Revoke</button>
              </div>
            </div>
          </div>
        ))}</div>}
    </>
  );
}

function SettingsView({ c }) {
  const [form,setForm]=useState({name:"ChatFlow",url:"",upload:"10MB"});
  const [saved,setSaved]=useState(false);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),3000);};
  return (
    <>
      <SectionHeader title="Settings" subtitle="Configure application-wide settings"/>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-4">General</h2>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium mb-1.5" style={{ color:c.textMuted }}>App Name</label><input type="text" value={form.name} onChange={set("name")} className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}/></div>
          <div><label className="block text-xs font-medium mb-1.5" style={{ color:c.textMuted }}>Site URL</label><input type="url" value={form.url} onChange={set("url")} placeholder="https://novalink.example.com" className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}/></div>
          <div><label className="block text-xs font-medium mb-1.5" style={{ color:c.textMuted }}>Max File Upload Size</label><select value={form.upload} onChange={set("upload")} className="w-full h-9 px-3 rounded-lg border text-sm outline-none" style={{ background:c.bgSubtle, borderColor:c.border, color:c.text }}><option>5MB</option><option>10MB</option><option>25MB</option><option>50MB</option></select></div>
        </div>
        <button onClick={save} className="mt-5 h-9 px-4 rounded-lg text-sm font-semibold admin-card-btn" style={{ background:c.accent, color:c.accentFg }}>Save Changes</button>
        {saved&&<Toast message="Settings saved!" color={c.success} onDone={()=>setSaved(false)}/>}
      </section>
      <section className="rounded-xl border p-5 mb-4" style={{ background:c.bgPanel, borderColor:c.border }}>
        <h2 className="text-sm font-semibold mb-2">Appearance</h2>
        <p className="text-sm" style={{ color:c.textMuted }}>Theme is controlled by the app's global theme system and applies across the entire platform automatically.</p>
      </section>
      <section className="rounded-xl border p-5" style={{ background:c.bgPanel, borderColor:`color-mix(in srgb,${c.danger} 35%,transparent)` }}>
        <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4" style={{ color:c.danger }}/><h2 className="text-sm font-semibold" style={{ color:c.danger }}>Danger Zone</h2></div>
        <p className="text-xs mb-4" style={{ color:c.textFaint }}>These actions are irreversible. Please be certain before proceeding.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={()=>window.confirm("Clear all chats? This cannot be undone.")} className="h-9 px-4 rounded-lg text-sm font-semibold border admin-card-btn" style={{ borderColor:`color-mix(in srgb,${c.danger} 50%,transparent)`, color:c.danger }}>Clear All Chats</button>
          <button onClick={()=>window.confirm("Reset all settings? This cannot be undone.")} className="h-9 px-4 rounded-lg text-sm font-semibold border admin-card-btn" style={{ borderColor:`color-mix(in srgb,${c.danger} 50%,transparent)`, color:c.danger }}>Reset to Defaults</button>
        </div>
      </section>
    </>
  );
}

function AuditView({ c, loading, users }) {
  const [search,setSearch]=useState("");
  const logs=useMemo(()=>{const actions=["Deleted user","Resolved request","Changed settings","Created chat","Updated profile","Logged in","Exported data","Added user","Revoked API key","Unlocked account"];const targets=["User","Request","Settings","Chat","Profile","System","Data","API Key"];return Array.from({length:12},(_,i)=>{const u=users[i%Math.max(users.length,1)]||{username:`user_${i}`};return{id:i,ts:new Date(Date.now()-i*3_600_000).toISOString(),actor:u.username??"unknown",action:actions[i%actions.length],target:targets[i%targets.length],ip:`192.168.1.${100+i}`};});},[users]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?logs.filter(l=>l.action.toLowerCase().includes(q)||l.actor.toLowerCase().includes(q)):logs;},[logs,search]);
  return (
    <>
      <SectionHeader title="Audit Log" subtitle="Track all administrative actions across the platform"/>
      <div className="relative mb-4"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color:c.textFaint }}/><input type="text" placeholder="Search by action or actor..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none" style={{ background:c.bgPanel, borderColor:c.border, color:c.text }}/></div>
      {loading?<div className="space-y-2">{[1,2,3,4,5].map(i=><Skeleton key={i} h="50px" radius="8px"/>)}</div>
        :filtered.length===0?<EmptyState icon={ClipboardList} message="No audit logs found"/>
        :<div className="rounded-xl border overflow-hidden" style={{ background:c.bgPanel, borderColor:c.border }}>
          <div className="overflow-x-auto"><table className="w-full text-left" style={{ minWidth:640 }}>
            <TableHead cols={["Timestamp","Actor","Action","Target","IP Address"]}/>
            <tbody>{filtered.map(log=><tr key={log.id} className="admin-row border-t" style={{ borderColor:c.border }}><td className="px-4 py-3 text-xs" style={{ color:c.textMuted }}>{new Date(log.ts).toLocaleString()}</td><td className="px-4 py-3 text-sm font-medium">@{log.actor}</td><td className="px-4 py-3 text-sm">{log.action}</td><td className="px-4 py-3 text-sm" style={{ color:c.textMuted }}>{log.target}</td><td className="px-4 py-3 text-xs font-mono" style={{ color:c.textFaint }}>{log.ip}</td></tr>)}</tbody>
          </table></div>
        </div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

export default function AdminPage({ currentUser, onLogout, onClose, onOpenChat }) {
  const [users,setUsers]=useState([]);
  const [chats,setChats]=useState([]);
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [activeNav,setActiveNav]=useState("dashboard");
  const [userSearch,setUserSearch]=useState("");
  const [resolving,setResolving]=useState(null);
  const [deleting,setDeleting]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);

  const token=getAuthToken();
  const base=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");

  const c={
    bgPrimary:"var(--color-background)",
    bgPanel:"color-mix(in srgb,var(--color-surface) 92%,var(--color-background) 8%)",
    bgSubtle:"color-mix(in srgb,var(--color-surface) 82%,var(--color-background) 18%)",
    text:"var(--color-text)",
    textMuted:"color-mix(in srgb,var(--color-text) 55%,transparent)",
    textFaint:"color-mix(in srgb,var(--color-text) 32%,transparent)",
    border:"color-mix(in srgb,var(--color-text) 10%,transparent)",
    borderMed:"color-mix(in srgb,var(--color-text) 18%,transparent)",
    accent:"var(--color-accent)",
    accentFg:"var(--color-background)",
    success:"color-mix(in srgb,var(--color-accent) 70%,var(--color-primary) 30%)",
    warning:"color-mix(in srgb,var(--color-neutral) 60%,var(--color-primary) 40%)",
    danger:"color-mix(in srgb,var(--color-neutral) 72%,var(--color-accent) 28%)",
    info:"var(--color-primary)",
  };

  async function fetchAdminData(silent=false) {
    try {
      if(!silent)setLoading(true);else setRefreshing(true);
      const h=token?{Authorization:`Bearer ${token}`}:{};
      const [uR,cR,rR]=await Promise.all([fetch(`${base}/api/admin/users`,{headers:h}),fetch(`${base}/api/chats`,{headers:h}),fetch(`${base}/api/admin/forgot-password-requests`,{headers:h})]);
      setUsers(normalizeList(await uR.json().catch(()=>({})),"users"));
      setChats(normalizeList(await cR.json().catch(()=>({})),"chats"));
      setRequests(normalizeList(await rR.json().catch(()=>({})),"requests"));
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(()=>{fetchAdminData();},[]);

  async function markResolved(id) {
    if(!id)return;setResolving(id);
    const h=token?{Authorization:`Bearer ${token}`}:{};
    await fetch(`${base}/api/admin/forgot-password-requests/${id}`,{method:"PATCH",headers:h});
    await fetchAdminData(true);setResolving(null);
  }

  async function deleteUser(id) {
    if(!id||!window.confirm("Delete this user? This cannot be undone."))return;
    setDeleting(id);const h=token?{Authorization:`Bearer ${token}`}:{};
    const res = await fetch(`${base}/api/admin/users/${id}/role`,{method:"PATCH",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify({isAdmin:false})});
    if(!res.ok){setDeleting(null);return;}
    await fetchAdminData(true);setDeleting(null);
  }

  async function messageUser(id) {
    if(!id)return;
    const h={"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};
    const res=await fetch(`${base}/api/chats`,{method:"POST",headers:h,body:JSON.stringify({type:"direct",participantIds:[id]})});
    if(!res.ok)return;
    const payload=await res.json();
    const chat=payload?.chat||payload?.data?.chat||payload?.data||payload;
    const chatId=String(chat?.id??chat?._id??"");
    if(!chatId)return;
    window.history.pushState({},"",`/chat/${chatId}`);
    onOpenChat?.(chatId);
  }

  const statCards=useMemo(()=>{
    const openReports=requests.filter(r=>!r.resolved&&!r.isResolved).length;
    const activeChats=chats.filter(ch=>ch?.active!==false).length;
    return[{label:"Total Users",value:users.length,delta:"+8.2%",positive:true,icon:Users},{label:"Active Chats",value:activeChats,delta:"+3.9%",positive:true,icon:MessageSquare},{label:"Open Reports",value:openReports,delta:"-1.1%",positive:false,icon:Flag},{label:"Forgot Password",value:requests.length,delta:"+2.4%",positive:false,icon:KeyRound}];
  },[users,chats,requests]);

  const activityFeed=useMemo(()=>[
    ...users.slice(0,3).map(u=>({id:`u-${u.id??u._id}`,type:"join",text:`${u.displayName??u.username} joined ChatFlow`,at:"just now"})),
    ...chats.slice(0,2).map(ch=>({id:`c-${ch.id??ch._id}`,type:"message",text:`New activity in ${ch.name||"Direct chat"}`,at:"2m ago"})),
    ...requests.slice(0,2).map(r=>({id:`r-${r.id??r._id}`,type:"warning",text:`Forgot password from @${r.username}`,at:"5m ago"})),
  ].slice(0,8),[users,chats,requests]);

  const filteredUsers=useMemo(()=>{const q=userSearch.trim().toLowerCase();return q?users.filter(u=>(u.displayName??"").toLowerCase().includes(q)||(u.username??"").toLowerCase().includes(q)):users;},[users,userSearch]);
  const pendingRequests=useMemo(()=>requests.filter(r=>!r.resolved&&!r.isResolved),[requests]);
  const resolvedRequests=useMemo(()=>requests.filter(r=>r.resolved||r.isResolved),[requests]);
  const dotColor=type=>({join:c.success,warning:c.warning,logout:c.textFaint,message:c.info}[type]??c.info);
  const healthItems=[{label:"CPU",value:62,icon:Cpu,color:c.warning},{label:"Memory",value:47,icon:MemoryStick,color:c.info},{label:"Disk",value:72,icon:HardDrive,color:c.danger},{label:"Uptime",value:93,icon:Wifi,color:c.success}];
  const pendingCount=pendingRequests.length;

  const navGroups=NAV_GROUPS.map(g=>({...g,items:g.items.map(item=>({...item,badge:item.badge==="reports"?(pendingCount>0?String(pendingCount):null):item.badge}))}));

  const shared={c,loading,users,chats,requests,activityFeed,statCards,filteredUsers,userSearch,setUserSearch,pendingRequests,resolvedRequests,healthItems,markResolved,deleteUser,messageUser,resolving,deleting,dotColor};

  const renderView=()=>{switch(activeNav){
    case"dashboard":    return<DashboardView {...shared}/>;
    case"analytics":    return<AnalyticsView c={c} loading={loading}/>;
    case"users":        return<UsersView c={c} loading={loading} users={users} deleteUser={deleteUser} messageUser={messageUser} deleting={deleting}/>;
    case"chats":        return<ChatsView c={c} loading={loading} chats={chats} onOpenChat={onOpenChat} onClose={onClose}/>;
    case"reports":      return<ReportsView c={c} loading={loading} requests={requests} markResolved={markResolved} resolving={resolving}/>;
    case"notifications":return<NotificationsView c={c} loading={loading} activityFeed={activityFeed}/>;
    case"permissions":  return<PermissionsView c={c}/>;
    case"security":     return<SecurityView c={c} loading={loading} users={users}/>;
    case"smtp":         return<SMTPView c={c}/>;
    case"api":          return<APIKeysView c={c}/>;
    case"settings":     return<SettingsView c={c}/>;
    case"audit":        return<AuditView c={c} loading={loading} users={users} requests={requests}/>;
    default:            return null;
  }};

  const NavContent=()=>(
    <>
      {navGroups.map(group=>(
        <div key={group.title} className="mb-4">
          <p className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color:c.textFaint }}>{group.title}</p>
          <div className="space-y-0.5">
            {group.items.map(item=>{const Icon=item.icon;const active=item.key===activeNav;return(
              <button key={item.key} onClick={()=>{setActiveNav(item.key);setSidebarOpen(false);}}
                className="admin-nav-btn w-full h-8 px-2 rounded-lg flex items-center justify-between text-sm"
                style={{ color:active?c.accent:c.textMuted, background:active?`color-mix(in srgb,${c.accent} 10%,transparent)`:"transparent", borderLeft:active?`2px solid ${c.accent}`:"2px solid transparent" }}>
                <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5"/><span className="text-[13px]">{item.label}</span></span>
                {item.badge&&<span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center" style={{ background:`color-mix(in srgb,${c.danger} 18%,transparent)`, color:c.danger }}>{item.badge}</span>}
              </button>
            );})}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        .admin-scroll::-webkit-scrollbar{width:4px}
        .admin-scroll::-webkit-scrollbar-track{background:transparent}
        .admin-scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--color-text) 18%,transparent);border-radius:4px}
        .admin-nav-btn{transition:background 0.12s,color 0.12s}
        .admin-nav-btn:hover{background:color-mix(in srgb,var(--color-text) 6%,transparent)!important}
        .admin-card-btn{transition:opacity 0.12s}
        .admin-card-btn:hover{opacity:0.8}
        .admin-row:hover{background:color-mix(in srgb,var(--color-text) 4%,transparent)!important}
        .admin-slide{animation:slideIn 0.2s ease}
      `}</style>

      <div className="fixed inset-0 z-[120] p-2 sm:p-4 md:p-6 flex items-center justify-center">
        <button className="absolute inset-0" style={{ background:"color-mix(in srgb,var(--color-background) 70%,transparent)" }} onClick={onClose} aria-label="Close"/>

        <div className="relative w-full max-w-[110rem] max-h-[94dvh] overflow-hidden rounded-2xl border flex flex-col" style={{ background:c.bgPrimary, color:c.text, borderColor:c.borderMed }}>

          {/* Top bar */}
          <div className="h-14 px-4 sm:px-6 border-b flex items-center justify-between shrink-0" style={{ background:c.bgPanel, borderColor:c.border }}>
            <div className="flex items-center gap-3">
              <button className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center border admin-card-btn" style={{ background:c.bgSubtle, borderColor:c.border }} onClick={()=>setSidebarOpen(!sidebarOpen)}><Menu className="h-4 w-4" style={{ color:c.textMuted }}/></button>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background:c.bgSubtle, border:`1px solid ${c.border}` }}><ChatFlowIcon className="h-6 w-6"/></div>
              <span className="text-base font-semibold">ChatFlow</span>
              <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:`color-mix(in srgb,${c.accent} 15%,transparent)`, color:c.accent }}>Admin</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:`color-mix(in srgb,${pendingCount>0?c.danger:c.success} 18%,transparent)`, color:pendingCount>0?c.danger:c.success, border:`1px solid color-mix(in srgb,${pendingCount>0?c.danger:c.success} 30%,transparent)` }}>{pendingCount>0?`${pendingCount} Alert${pendingCount>1?"s":""}` :"No Alerts"}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:`color-mix(in srgb,${c.success} 18%,transparent)`, color:c.success, border:`1px solid color-mix(in srgb,${c.success} 30%,transparent)` }}>System OK</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>fetchAdminData(true)} className="h-8 w-8 rounded-lg flex items-center justify-center border admin-card-btn" style={{ background:c.bgSubtle, borderColor:c.border }} title="Refresh"><RefreshCw className="h-3.5 w-3.5" style={{ color:c.textMuted, animation:refreshing?"spin 0.8s linear infinite":"none" }}/></button>
              <button className="h-8 px-3 text-xs rounded-lg border admin-card-btn" style={{ background:c.bgSubtle, borderColor:c.border, color:c.textMuted }} onClick={onClose}>Close</button>
              <button className="h-8 px-3 text-xs rounded-lg border admin-card-btn" style={{ background:c.bgSubtle, borderColor:c.border, color:c.textMuted }} onClick={onLogout}>Logout</button>
              <div className="h-8 rounded-full px-2.5 flex items-center gap-2 border" style={{ background:c.bgSubtle, borderColor:c.border }}>
                <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background:c.accent, color:c.accentFg }}>{initials(currentUser?.displayName??currentUser?.username??"AD")}</div>
                <span className="text-xs hidden sm:block" style={{ color:c.textMuted }}>{currentUser?.displayName??"Admin"}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 relative">
            {/* Mobile sidebar */}
            {sidebarOpen&&(
              <div className="lg:hidden absolute inset-0 z-20 flex">
                <button className="absolute inset-0" style={{ background:"rgba(0,0,0,0.4)" }} onClick={()=>setSidebarOpen(false)}/>
                <aside className="admin-slide relative w-[220px] border-r overflow-y-auto admin-scroll p-3" style={{ background:c.bgPanel, borderColor:c.border }}><NavContent/></aside>
              </div>
            )}
            {/* Desktop sidebar */}
            <aside className="w-[190px] min-w-[190px] border-r overflow-y-auto admin-scroll p-3 shrink-0 hidden lg:block" style={{ background:c.bgPanel, borderColor:c.border }}><NavContent/></aside>
            {/* Main content */}
            <main className="flex-1 overflow-y-auto admin-scroll p-4 sm:p-5" style={{ background:c.bgPrimary }}>{renderView()}</main>
          </div>

          {/* Loading overlay */}
          {loading&&(
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background:"color-mix(in srgb,var(--color-background) 75%,transparent)" }}>
              <div className="rounded-xl border px-5 py-3 flex items-center gap-3 text-sm" style={{ background:c.bgPanel, borderColor:c.border }}>
                <RefreshCw className="h-4 w-4" style={{ color:c.accent, animation:"spin 0.8s linear infinite" }}/>Loading dashboard...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
