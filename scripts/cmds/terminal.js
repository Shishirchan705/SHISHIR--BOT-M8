"use strict";

const fs      = require("fs-extra");
const path    = require("path");
const os      = require("os");
const { exec }        = require("child_process");
const { performance } = require("perf_hooks");

const ACCOUNTS_DIR = path.join(process.cwd(), "accounts");
const BLOCK_FILE   = path.join(process.cwd(), "core/data", "blockedUsers.json");

const SHELL_BLOCK = ["rm -rf /", "mkfs", "dd if=", ":(){:|:&};:", "chmod -R 777 /", ">/dev/sda"];
const SECRET_RE   = /(KEY|TOKEN|SECRET|PASS|PWD|MONGO|URI|CONN|AUTH|CRED)/i;

const D1 = "━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const D2 = "─────────────────────────────";

function box(title, lines, footer) {
    const body = (lines || []).filter(l => l != null).join("\n");
    const foot = footer ? `\n${D2}\n${footer}` : "";
    return `『 ${title} 』\n${D1}\n${body}${foot}`;
}
function row(icon, label, value) {
    return `${icon} ${label} › ${value}`;
}
function ok(msg)   { return `✅ ${msg}`; }
function err(msg)  { return `❌ ${msg}`; }
function warn(msg) { return `⚠️  ${msg}`; }
function tip(msg)  { return `💡 ${msg}`; }
function sec(name) { return `${D2}\n  ${name}`; }

function bar(pct, len = 10) {
    const f = Math.round(Math.max(0, Math.min(100, pct)) / 100 * len);
    return "█".repeat(f) + "░".repeat(len - f);
}
function hpIcon(score) {
    return score >= 75 ? "🟢" : score >= 40 ? "🟡" : "🔴";
}
function fmtBytes(b) {
    const u = ["B","KB","MB","GB"]; let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`;
}
function fmtDur(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60), sc = s % 60;
    const p = [];
    if (d) p.push(d + "ᴅ");
    if (h) p.push(h + "ʜ");
    if (m) p.push(m + "ᴍ");
    p.push(sc + "ꜱ");
    return p.join(" ");
}
function ageOf(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60)    return s + "ꜱ ᴀɢᴏ";
    if (s < 3600)  return Math.floor(s / 60)   + "ᴍ ᴀɢᴏ";
    if (s < 86400) return Math.floor(s / 3600)  + "ʜ ᴀɢᴏ";
    return Math.floor(s / 86400) + "ᴅ ᴀɢᴏ";
}
function scoreBar(score) {
    const f = Math.round((score / 100) * 10);
    return "█".repeat(f) + "░".repeat(10 - f) + ` ${score}%`;
}

const jread  = p => { try { return fs.readJsonSync(p); } catch { return null; } };
const jwrite = (p, d) => { try { fs.outputJsonSync(p, d, { spaces: 2 }); return true; } catch { return false; } };

function listCookieFiles() {
    if (!fs.existsSync(ACCOUNTS_DIR)) return [];
    const out = [];
    for (let i = 1; i <= 10; i++) {
        const fname = i === 1 ? "account.txt" : `account${i}.txt`;
        const p = path.join(ACCOUNTS_DIR, fname);
        if (!fs.existsSync(p)) continue;
        let raw = "";
        try { raw = fs.readFileSync(p, "utf8").trim(); } catch {}
        let cuid = null;
        try {
            const arr = JSON.parse(raw);
            const c = Array.isArray(arr) && arr.find(c => (c.key || c.name) === "c_user");
            cuid = c ? c.value : null;
        } catch {}
        out.push({ slot: i, file: fname, hasContent: raw.length > 2, cuid, size: raw.length });
    }
    return out;
}

function parseAcctArg(arg) {
    const mm = (arg || "").match(/^account(\d+)(?:\.txt)?$/i);
    if (!mm) return null;
    const n = parseInt(mm[1]);
    return {
        n,
        fname: n === 1 ? "account.txt" : `account${n}.txt`,
        file:  path.join(ACCOUNTS_DIR, n === 1 ? "account.txt" : `account${n}.txt`),
    };
}

function getMgr()    { try { return require("../../bot/login/multiAccountManager.js"); } catch { return null; } }
function getPref()   { try { return require("../../core/auth/accountPreference.js").getPreferred(); } catch { return null; } }
function setPref(f)  { try { require("../../core/auth/accountPreference.js").setPreferredCookie(f); } catch {} }
function clearPref() { try { require("../../core/auth/accountPreference.js").clearPreferred(); } catch {} }
function blockedList()  { return jread(BLOCK_FILE) || []; }
function saveBlocked(a) { return jwrite(BLOCK_FILE, [...new Set(a.map(String))]); }
function safeUID(api)   { try { return api?.getCurrentUserID?.() || "?"; } catch { return "?"; } }

async function safeUserInfo(api, uid) {
    if (!api || uid === "?") return null;
    try {
        const r = await new Promise((rs, rj) =>
            api.getUserInfo(uid, (e, x) => e ? rj(e) : rs(x)));
        return r?.[uid] || null;
    } catch { return null; }
}

function doRestart(reply, msg) {
    return Promise.resolve(reply(ok(`ʀᴇꜱᴛᴀʀᴛɪɴɢ ʙᴏᴛ…  ${msg}`))).then(() => {
        setTimeout(() => process.exit(2), 2500);
    });
}

function findCookieFileByUid(uid) {
    return listCookieFiles().find(c => c.cuid === String(uid).trim()) || null;
}

async function findLatestLog() {
    return new Promise(resolve => {
        const cmds = [
            "ls -1t /tmp/logs/Start_application_*.log 2>/dev/null | head -1",
            "ls -1t /tmp/logs/*.log 2>/dev/null | head -1",
        ];
        let i = 0;
        function next() {
            if (i >= cmds.length) return resolve(null);
            exec(cmds[i++], (_, f) => {
                const file = (f || "").trim();
                file ? resolve(file) : next();
            });
        }
        next();
    });
}

module.exports = {
    config: {
        name             : "terminal",
        aliases          : ["term", "tr"],
        version          : "1.0.0",
        author           : "SIFAT",
        countDown        : 2,
        role             : 2,
        shortDescription : { en: "Bot control terminal" },
        longDescription  : { en: "Advanced bot management — accounts, cookies, system, messaging and more." },
        category         : "developer",
        guide            : { en: "{pn} help" },
    },

    onStart: async function ({ api, event, args, message, prefix }) {
        const reply = t => message.reply(t);
        const ctx   = { reply, api, prefix: prefix || global.GoatBot?.config?.prefix || "!", event };
        try {
            return await _run({ args, ctx, event });
        } catch (e) {
            try { await reply(err("ᴛᴇʀᴍɪɴᴀʟ ᴇʀʀᴏʀ › " + (e?.message || String(e)))); } catch {}
        }
    },

    onReply: async function ({ api, event, message, Reply }) {
        const reply = t => message.reply(t);
        if (event.senderID !== Reply.author) return;
        const raw = (event.body || "").trim();
        if (!raw.startsWith("[") && !raw.startsWith("{"))
            return reply(err("ɪɴᴠᴀʟɪᴅ ꜰᴏʀᴍᴀᴛ — ꜱᴇɴᴅ ᴀ JSON ᴄᴏᴏᴋɪᴇ ᴀʀʀᴀʏ ꜱᴛᴀʀᴛɪɴɢ ᴡɪᴛʜ ["));
        try {
            let parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) && parsed?.appState) parsed = parsed.appState;
            if (!Array.isArray(parsed))  throw new Error("ᴍᴜꜱᴛ ʙᴇ ᴀ JSON ᴀʀʀᴀʏ");
            if (!parsed.length)          throw new Error("ᴀʀʀᴀʏ ɪꜱ ᴇᴍᴘᴛʏ");

            const get  = k => parsed.find(c => (c.key || c.name) === k)?.value;
            const cuid = get("c_user"), xs = get("xs"), datr = get("datr");
            const valid = !!(cuid && xs);

            fs.ensureDirSync(ACCOUNTS_DIR);
            fs.writeFileSync(Reply.accountFile, JSON.stringify(parsed, null, 2));

            if (valid) {
                try {
                    const mgr = getMgr();
                    if (mgr?.lockedAccounts?.has(Reply.accountFile)) mgr.unlockAccount(Reply.accountFile);
                    mgr?.boostAccount?.(Reply.accountFile, 100);
                    if (mgr?.accountCooldown) mgr.accountCooldown[Reply.accountFile] = 0;
                } catch {}
            }

            await reply(box(valid ? "✅ ᴄᴏᴏᴋɪᴇ ᴜᴘᴅᴀᴛᴇᴅ" : "⚠️ ᴄᴏᴏᴋɪᴇ ꜱᴀᴠᴇᴅ", [
                row("📄", "ꜰɪʟᴇ",    Reply.accountName),
                row("🔢", "ᴇɴᴛʀɪᴇꜱ", parsed.length),
                row(cuid ? "✅" : "❌", "ᴄ_ᴜꜱᴇʀ", cuid  || "ᴍɪꜱꜱɪɴɢ"),
                row(xs   ? "✅" : "❌", "xꜱ",     xs    ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                row(datr ? "✅" : "⚠️", "ᴅᴀᴛʀ",   datr  ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                ...(valid ? [D2, "🔄 ʀᴇꜱᴛᴀʀᴛɪɴɢ ɪɴ 3ꜱ…"] : []),
            ], valid ? "🟢 ᴠᴀʟɪᴅ — ᴀᴄᴄᴏᴜɴᴛ ᴜɴʟᴏᴄᴋᴇᴅ" : "⚠️ ꜱᴀᴠᴇᴅ ʙᴜᴛ ꜱᴏᴍᴇ ᴋᴇʏꜱ ᴍɪꜱꜱɪɴɢ"));
            if (valid) setTimeout(() => process.exit(2), 3000);
        } catch (e) {
            return reply(err("ᴄᴏᴏᴋɪᴇ ᴘᴀʀꜱᴇ ꜰᴀɪʟᴇᴅ › " + e.message));
        }
    },
};

async function _run({ args, ctx, event }) {
    event = event || ctx?.event || {};
    const { reply, api, prefix: P } = ctx;
    const sub  = (args[0] || "help").toLowerCase();
    const rest = args.slice(1);

    if (sub === "help" || sub === "?" || sub === "h") {
        return reply(box("🖥️  ᴛᴇʀᴍɪɴᴀʟ  v1.0.0", [
            sec("🔐 ᴀᴄᴄᴏᴜɴᴛ & ᴄᴏᴏᴋɪᴇ"),
            `  account status        — ʜᴇᴀʟᴛʜ & ʟᴏᴄᴋ ꜱᴛᴀᴛᴜꜱ`,
            `  account unlock <N>    — ᴜɴʟᴏᴄᴋ ᴀᴄᴄᴏᴜɴᴛ`,
            `  account boost <N> [n] — ʀᴇꜱᴛᴏʀᴇ ʜᴇᴀʟᴛʜ`,
            `  account reset <N>     — ꜰᴜʟʟ ʀᴇꜱᴇᴛ`,
            `  cookie check          — ᴠᴀʟɪᴅᴀᴛᴇ ᴀʟʟ ᴄᴏᴏᴋɪᴇꜱ`,
            `  cookie update <N>     — ᴘᴀꜱᴛᴇ ɴᴇᴡ ᴄᴏᴏᴋɪᴇ (ʀᴇᴘʟʏ)`,
            `  cookie save [N] [json]— ꜱᴀᴠᴇ ᴄᴜʀʀᴇɴᴛ ꜱᴇꜱꜱɪᴏɴ`,
            `  cookie test <N>       — ᴛᴇꜱᴛ ᴄᴏᴏᴋɪᴇ ꜰɪᴇʟᴅꜱ`,
            `  cookie info           — ʟɪꜱᴛ ᴀʟʟ ᴄᴏᴏᴋɪᴇ ꜰɪʟᴇꜱ`,
            `  cookie delete <N>     — ᴅᴇʟᴇᴛᴇ ᴄᴏᴏᴋɪᴇ ꜰɪʟᴇ`,
            sec("⚙️  ꜱʏꜱᴛᴇᴍ"),
            `  status   — ʙᴏᴛ ꜱᴛᴀᴛᴜꜱ & ʀᴇꜱᴏᴜʀᴄᴇꜱ`,
            `  botinfo  — ᴅᴇᴛᴀɪʟᴇᴅ ʙᴏᴛ ɪɴꜰᴏ`,
            `  me       — ᴄᴜʀʀᴇɴᴛ ʙᴏᴛ ɪᴅᴇɴᴛɪᴛʏ`,
            `  list     — ʟɪꜱᴛ ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ`,
            `  token    — ꜱᴇꜱꜱɪᴏɴ ᴛᴏᴋᴇɴ ɪɴꜰᴏ`,
            `  ping     — ʟᴀᴛᴇɴᴄʏ ᴛᴏ ꜰᴀᴄᴇʙᴏᴏᴋ`,
            `  logs [N] — ᴛᴀɪʟ ʙᴏᴛ ʟᴏɢ`,
            sec("🔧 ᴄᴏɴᴛʀᴏʟꜱ"),
            `  restart       — ʜᴏᴛ ʀᴇꜱᴛᴀʀᴛ`,
            `  reset         — ᴄʟᴇᴀʀ ᴘɪɴ + ʀᴇꜱᴛᴀʀᴛ`,
            `  kill          — ꜱᴛᴏᴘ ʙᴏᴛ (ɴᴏ ʀᴇꜱᴘᴀᴡɴ)`,
            `  run <N>       — ꜱᴡɪᴛᴄʜ ᴛᴏ ᴀᴄᴄᴏᴜɴᴛN`,
            `  switch <N>    — ꜱᴀᴍᴇ ᴀꜱ ʀᴜɴ`,
            `  clear         — ᴄʟᴇᴀʀ ᴘɪɴɴᴇᴅ ᴀᴄᴄᴏᴜɴᴛ`,
            sec("✉️  ᴍᴇꜱꜱᴀɢɪɴɢ"),
            `  broadcast <msg>  — ꜱᴇɴᴅ ᴛᴏ ᴀʟʟ ɢʀᴏᴜᴘꜱ`,
            `  dm <uid> <msg>   — ᴅɪʀᴇᴄᴛ ᴍᴇꜱꜱᴀɢᴇ`,
            `  threads [N]      — ʟɪꜱᴛ ᴛʜʀᴇᴀᴅꜱ`,
            `  who <uid>        — ᴜꜱᴇʀ ɪɴꜰᴏ`,
            `  tid              — ᴛʜʀᴇᴀᴅ & ꜱᴇɴᴅᴇʀ ɪᴅ`,
            sec("🛡️  ᴍᴏᴅᴇʀᴀᴛɪᴏɴ"),
            `  block <uid>    — ʙʟᴏᴄᴋ ᴜꜱᴇʀ`,
            `  unblock <uid>  — ᴜɴʙʟᴏᴄᴋ ᴜꜱᴇʀ`,
            `  blocked        — ʟɪꜱᴛ ʙʟᴏᴄᴋᴇᴅ ᴜꜱᴇʀꜱ`,
            sec("🔬 ᴅᴇᴠᴇʟᴏᴘᴇʀ"),
            `  eval <js>           — ʀᴜɴ JavaScript`,
            `  exec [t=N] <cmd>    — ʀᴜɴ ꜱʜᴇʟʟ ᴄᴏᴍᴍᴀɴᴅ`,
            `  config [key] [val]  — ᴠɪᴇᴡ/ᴇᴅɪᴛ config.json`,
            `  url                 — ᴅᴀꜱʜʙᴏᴀʀᴅ ʟɪɴᴋ`,
            sec("💾 ʙᴀᴄᴋᴜᴘ"),
            `  backup          — ᴄʀᴇᴀᴛᴇ ᴄᴏᴏᴋɪᴇ ʙᴀᴄᴋᴜᴘ`,
            `  backup list     — ʟɪꜱᴛ ʙᴀᴄᴋᴜᴘꜱ`,
            `  restore <name>  — ʀᴇꜱᴛᴏʀᴇ ꜰʀᴏᴍ ʙᴀᴄᴋᴜᴘ`,
        ], `${P}terminal <subcommand>`));
    }

    if (sub === "status" || sub === "stat" || sub === "s") {
        const mgr    = getMgr();
        const s      = mgr?.getStats?.() || {};
        const mem    = process.memoryUsage();
        const total  = os.totalmem(), free = os.freemem();
        const ramPct = Math.round(((total - free) / total) * 100);
        const uptime = Math.floor(process.uptime());
        return reply(box("📊 ꜱᴛᴀᴛᴜꜱ", [
            row("🤖", "ᴀᴄᴄᴏᴜɴᴛ",  s.currentAccount || "?"),
            row("🔢", "ꜱʟᴏᴛ",     `${(s.currentIndex ?? 0) + 1} / ${s.totalAccounts ?? "?"}`),
            row("⏱️", "ᴜᴘᴛɪᴍᴇ",   fmtDur(uptime)),
            row("🔄", "ꜱᴡɪᴛᴄʜᴇꜱ", String(s.switchCount ?? 0)),
            row("#",  "ᴘɪᴅ",      String(process.pid)),
            row("⌬",  "ɴᴏᴅᴇ",    process.version),
            D2,
            row("🧠", "ʀᴀᴍ",      `${fmtBytes(mem.rss)}  sys: ${ramPct}% ${bar(ramPct)}`),
            row("♨️", "ʜᴇᴀᴘ",     `${fmtBytes(mem.heapUsed)} / ${fmtBytes(mem.heapTotal)}`),
            row("⚡", "ᴄᴘᴜ 1ᴍ",  os.loadavg()[0].toFixed(2)),
            D2,
            row("📜", "ᴄᴏᴍᴍᴀɴᴅꜱ", String(global.GoatBot?.commands?.size ?? global.client?.commands?.size ?? "?")),
            row("🖥️", "ʜᴏꜱᴛ",    os.hostname()),
        ], "ʟɪᴠᴇ ꜱᴛᴀᴛꜱ"));
    }

    if (sub === "botinfo" || sub === "bi") {
        const mem     = process.memoryUsage();
        const cookies = listCookieFiles();
        const uid     = safeUID(api);
        const u       = await safeUserInfo(api, uid);
        const name    = u?.name || "?";
        const curFile = global.client?.dirAccount ? path.basename(global.client.dirAccount) : "?";
        return reply(box("🤖 ʙᴏᴛ ɪɴꜰᴏ", [
            row("🔑", "ꜰʙ ᴜɪᴅ",   uid),
            row("👤", "ɴᴀᴍᴇ",     name),
            row("🍪", "ꜰɪʟᴇ",     curFile),
            D2,
            row("⏱️", "ᴜᴘᴛɪᴍᴇ",  fmtDur(Math.floor(process.uptime()))),
            row("#",  "ᴘɪᴅ",     String(process.pid)),
            row("⌬",  "ɴᴏᴅᴇ",   process.version),
            row("💻", "ᴘʟᴀᴛꜰᴏʀᴍ", `${os.platform()} ${os.arch()}`),
            D2,
            row("🧠", "ʀᴀᴍ",     `${fmtBytes(mem.rss)} / ${fmtBytes(os.totalmem())}`),
            row("♨️", "ʜᴇᴀᴘ",    `${fmtBytes(mem.heapUsed)} / ${fmtBytes(mem.heapTotal)}`),
            row("⚡", "ᴄᴘᴜ 1ᴍ", os.loadavg()[0].toFixed(2)),
            D2,
            row("📜", "ᴄᴏᴍᴍᴀɴᴅꜱ", String(global.GoatBot?.commands?.size ?? global.client?.commands?.size ?? "?")),
            row("🍪", "ᴀᴄᴄᴏᴜɴᴛꜱ", `${cookies.filter(c => c.hasContent).length} / ${cookies.length} ꜰɪʟʟᴇᴅ`),
        ]));
    }

    if (sub === "me") {
        const uid  = safeUID(api);
        const u    = await safeUserInfo(api, uid);
        const name = u?.name || "?";
        return reply(box("👤 ᴍʏ ɪᴅᴇɴᴛɪᴛʏ", [
            row("🔑", "ᴜɪᴅ",  uid),
            row("👤", "ɴᴀᴍᴇ", name),
            row("🍪", "ꜰɪʟᴇ", global.client?.dirAccount ? path.basename(global.client.dirAccount) : "?"),
            row("⏱️", "ᴜᴘᴛɪᴍᴇ", fmtDur(Math.floor(process.uptime()))),
        ]));
    }

    if (sub === "list" || sub === "ls") {
        const cookies = listCookieFiles();
        const pref    = getPref();
        const mgr     = getMgr();
        const cur     = mgr?.getStats?.()?.currentAccount || "";
        if (!cookies.length) return reply(warn("ɴᴏ ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ ꜰᴏᴜɴᴅ ɪɴ accounts/"));
        const lines = cookies.map(c => {
            const pinned  = (pref?.kind === "cookie" && pref.value === c.file) ? " ★" : "";
            const active  = c.file === cur ? " ◀ ᴀᴄᴛɪᴠᴇ" : "";
            const icon    = c.hasContent ? "🟢" : "⭕";
            return `${icon} ${c.file}${pinned}${active}  ${c.cuid ? "uid: " + c.cuid : "(ᴇᴍᴘᴛʏ)"}`;
        });
        return reply(box("🍪 ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ", lines, "🟢 ꜰɪʟʟᴇᴅ  ⭕ ᴇᴍᴘᴛʏ  ★ ᴘɪɴɴᴇᴅ  ◀ ᴀᴄᴛɪᴠᴇ"));
    }

    if (sub === "token" || sub === "session") {
        const uid       = safeUID(api);
        const u         = await safeUserInfo(api, uid);
        const name      = u?.name || "?";
        const curFile   = global.client?.dirAccount ? path.basename(global.client.dirAccount) : "?";
        const cookies   = listCookieFiles();
        const current   = cookies.find(c => c.cuid === uid);
        let xs = "?", datr = "?", count = "?", age = "?";
        if (current) {
            try {
                const arr = JSON.parse(fs.readFileSync(path.join(ACCOUNTS_DIR, current.file), "utf8"));
                const get = k => arr.find(x => (x.key || x.name) === k)?.value;
                xs   = get("xs")   ? "✅ ᴘʀᴇꜱᴇɴᴛ" : "❌ ᴍɪꜱꜱɪɴɢ";
                datr = get("datr") ? "✅ ᴘʀᴇꜱᴇɴᴛ" : "⚠️  ᴍɪꜱꜱɪɴɢ";
                count = String(arr.length);
                try { age = ageOf(fs.statSync(path.join(ACCOUNTS_DIR, current.file)).mtimeMs); } catch {}
            } catch {}
        }
        return reply(box("🔑 ꜱᴇꜱꜱɪᴏɴ ᴛᴏᴋᴇɴ", [
            row("🔑", "ᴜɪᴅ",        uid),
            row("👤", "ɴᴀᴍᴇ",       name),
            row("🍪", "ᴄᴏᴏᴋɪᴇ ꜰɪʟᴇ", curFile),
            D2,
            row("🔐", "xꜱ ᴛᴏᴋᴇɴ",  xs),
            row("🔐", "ᴅᴀᴛʀ",      datr),
            row("#",  "ᴛᴏᴛᴀʟ ᴋᴇʏꜱ", count),
            row("⏱️", "ʟᴀꜱᴛ ꜱᴀᴠᴇᴅ", age),
        ]));
    }

    if (sub === "cookie") {
        const op = (rest[0] || "").toLowerCase();

        if (op === "update" || op === "paste" || op === "new") {
            const rawTarget = (rest[1] || "").trim();
            let n, fname, file;
            if (!rawTarget) {
                const curPath = global.client?.dirAccount || path.join(ACCOUNTS_DIR, "account.txt");
                fname = path.basename(curPath);
                file  = curPath;
                const m2 = fname.match(/^account(\d+)?\.txt$/i);
                n = m2 ? (parseInt(m2[1]) || 1) : 1;
            } else {
                const m = rawTarget.match(/^account(\d+)(?:\.txt)?$/i);
                if (!m) return reply(warn("ᴜꜱᴀɢᴇ › cookie update account1 | cookie update account2"));
                n = parseInt(m[1]);
                fname = n === 1 ? "account.txt" : `account${n}.txt`;
                file  = path.join(ACCOUNTS_DIR, fname);
            }
            const prompt = box("🍪 ᴄᴏᴏᴋɪᴇ ᴜᴘᴅᴀᴛᴇ — " + fname, [
                "📋 ʀᴇᴘʟʏ ᴛᴏ ᴛʜɪꜱ ᴍᴇꜱꜱᴀɢᴇ ᴡɪᴛʜ ʏᴏᴜʀ",
                "   ɴᴇᴡ ᴄᴏᴏᴋɪᴇ JSON ᴀʀʀᴀʏ.",
                D2,
                'ꜰᴏʀᴍᴀᴛ: [{"key":"c_user","value":"..."},...]',
                D2,
                "⏳ ᴡᴀɪᴛɪɴɢ ꜰᴏʀ ʏᴏᴜʀ ʀᴇᴘʟʏ…",
            ], "ʀᴇᴘʟʏ ɴᴏᴡ ᴛᴏ ᴘᴀꜱᴛᴇ ᴄᴏᴏᴋɪᴇ");
            const sent = await new Promise((rs, rj) =>
                api.sendMessage(prompt, event.threadID, (e, i) => e ? rj(e) : rs(i)));
            global.GoatBot.onReply.set(sent.messageID, {
                commandName: "terminal",
                author: event.senderID,
                accountFile: file,
                accountName: fname,
            });
            return;
        }

        if (op === "save") {
            try {
                const rawBody   = (event.body || "").trim();
                const si        = rawBody.search(/\bcookie\s+save\b/i);
                const afterSave = si >= 0
                    ? rawBody.slice(si).replace(/^cookie\s+save\s*/i, "").trim()
                    : rest.slice(1).join(" ").trim();
                let file;
                const acctMatch = afterSave.match(/^(account(\d+)(?:\.txt)?)\s*/i);
                if (acctMatch) {
                    const n = parseInt(acctMatch[2]);
                    file = path.join(ACCOUNTS_DIR, n === 1 ? "account.txt" : `account${n}.txt`);
                } else {
                    file = global.client?.dirAccount;
                    if (!file) return reply(warn("ɴᴏ ᴀᴄᴛɪᴠᴇ ᴀᴄᴄᴏᴜɴᴛ ›  ꜱᴘᴇᴄɪꜰʏ: cookie save account2"));
                }
                const jsonStr = acctMatch ? afterSave.slice(acctMatch[0].length).trim() : afterSave;
                let appState;
                if (jsonStr.startsWith("[") || jsonStr.startsWith("{")) {
                    let parsed = JSON.parse(jsonStr);
                    if (!Array.isArray(parsed) && parsed?.appState) parsed = parsed.appState;
                    if (!Array.isArray(parsed)) throw new Error("ᴍᴜꜱᴛ ʙᴇ ᴀ JSON ᴀʀʀᴀʏ");
                    appState = parsed;
                } else {
                    if (!api?.getAppState) throw new Error("ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ");
                    appState = api.getAppState();
                }
                fs.ensureDirSync(ACCOUNTS_DIR);
                fs.writeFileSync(file, JSON.stringify(appState, null, 2));
                const get  = k => appState.find(c => (c.key || c.name) === k)?.value;
                const cuid = get("c_user"), xs = get("xs"), datr = get("datr");
                const valid = !!(cuid && xs);
                if (valid) {
                    try {
                        const mgr = getMgr();
                        if (mgr?.lockedAccounts?.has(file)) mgr.unlockAccount(file);
                        mgr?.boostAccount?.(file, 100);
                        if (mgr?.accountCooldown) mgr.accountCooldown[file] = 0;
                    } catch {}
                }
                return reply(box(valid ? "✅ ᴄᴏᴏᴋɪᴇ ꜱᴀᴠᴇᴅ" : "⚠️ ᴄᴏᴏᴋɪᴇ ꜱᴀᴠᴇᴅ", [
                    row("📄", "ꜰɪʟᴇ",    path.basename(file)),
                    row("🔢", "ᴇɴᴛʀɪᴇꜱ", appState.length),
                    row(cuid ? "✅" : "❌", "ᴄ_ᴜꜱᴇʀ", cuid || "ᴍɪꜱꜱɪɴɢ"),
                    row(xs   ? "✅" : "❌", "xꜱ",     xs   ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                    row(datr ? "✅" : "⚠️", "ᴅᴀᴛʀ",   datr ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                ], valid ? "🟢 ᴠᴀʟɪᴅ ᴄᴏᴏᴋɪᴇ" : "⚠️ ꜱᴏᴍᴇ ᴋᴇʏꜱ ᴍɪꜱꜱɪɴɢ"));
            } catch (e) { return reply(err("ꜱᴀᴠᴇ ꜰᴀɪʟᴇᴅ › " + e.message)); }
        }

        if (op === "test") {
            const a = parseAcctArg(rest[1] || "");
            if (!a) return reply(warn("ᴜꜱᴀɢᴇ › cookie test account1"));
            if (!fs.existsSync(a.file)) return reply(err("ꜰɪʟᴇ ɴᴏᴛ ꜰᴏᴜɴᴅ › " + a.fname));
            try {
                const arr  = JSON.parse(fs.readFileSync(a.file, "utf8"));
                if (!Array.isArray(arr)) throw new Error("ɴᴏᴛ ᴀ JSON ᴀʀʀᴀʏ");
                const get  = k => arr.find(c => (c.key || c.name) === k)?.value;
                const cuid = get("c_user"), xs = get("xs"), datr = get("datr");
                const valid = !!(cuid && xs);
                return reply(box("🔍 ᴄᴏᴏᴋɪᴇ ᴛᴇꜱᴛ — " + a.fname, [
                    row("🔢", "ᴄᴏᴜɴᴛ",  arr.length),
                    row("📦", "ꜱɪᴢᴇ",   fmtBytes(fs.statSync(a.file).size)),
                    row(cuid ? "✅" : "❌", "ᴄ_ᴜꜱᴇʀ", cuid || "ᴍɪꜱꜱɪɴɢ"),
                    row(xs   ? "✅" : "❌", "xꜱ",     xs   ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                    row(datr ? "✅" : "⚠️", "ᴅᴀᴛʀ",   datr ? "ᴘʀᴇꜱᴇɴᴛ" : "ᴍɪꜱꜱɪɴɢ"),
                ], valid ? "🟢 ᴄᴏᴏᴋɪᴇ ʟᴏᴏᴋꜱ ᴠᴀʟɪᴅ" : "🔴 ᴄᴏᴏᴋɪᴇ ɪꜱ ɪɴᴄᴏᴍᴘʟᴇᴛᴇ"));
            } catch (e) { return reply(err("ᴘᴀʀꜱᴇ ꜰᴀɪʟᴇᴅ › " + e.message)); }
        }

        if (op === "info") {
            const cookies = listCookieFiles();
            if (!cookies.length) return reply(warn("ɴᴏ ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ ꜰᴏᴜɴᴅ ɪɴ accounts/"));
            const lines = cookies.map(c => {
                let age = "?";
                try { age = ageOf(fs.statSync(path.join(ACCOUNTS_DIR, c.file)).mtimeMs); } catch {}
                return row(c.hasContent ? "🟢" : "⭕", c.file,
                    `uid: ${c.cuid || "?"} | ${fmtBytes(c.size)} | ${age}`);
            });
            return reply(box("🍪 ᴄᴏᴏᴋɪᴇ ɪɴꜰᴏ", lines, `${cookies.length} ꜰɪʟᴇ(ꜱ) ꜰᴏᴜɴᴅ`));
        }

        if (op === "check" || op === "scan" || op === "validate") {
            const cookies = listCookieFiles();
            if (!cookies.length) return reply(warn("ɴᴏ ᴀᴄᴄᴏᴜɴᴛ ꜰɪʟᴇꜱ ꜰᴏᴜɴᴅ"));
            const mgr    = getMgr();
            const mStats = mgr?.getStats?.() || {};
            const mMap   = new Map((mStats.accounts || []).map(a => [a.name, a]));
            const results = [];
            for (const c of cookies) {
                const fp = path.join(ACCOUNTS_DIR, c.file);
                let icon = "❓", detail = "ᴇᴍᴘᴛʏ", valid = false;
                try {
                    const raw = fs.readFileSync(fp, "utf8").trim();
                    if (!raw || raw.length < 10) { icon = "⭕"; detail = "ᴇᴍᴘᴛʏ ꜰɪʟᴇ"; }
                    else {
                        const arr  = JSON.parse(raw);
                        const get  = k => arr.find(x => (x.key || x.name) === k)?.value;
                        const cuid = get("c_user"), xs = get("xs");
                        let age = "?";
                        try { age = ageOf(fs.statSync(fp).mtimeMs); } catch {}
                        if (!cuid && !xs) { icon = "❌"; detail = "ᴍɪꜱꜱɪɴɢ ᴄ_ᴜꜱᴇʀ + xꜱ"; }
                        else if (!cuid)   { icon = "⚠️"; detail = "ɴᴏ ᴄ_ᴜꜱᴇʀ  xꜱ=✓"; }
                        else if (!xs)     { icon = "⚠️"; detail = `ᴜɪᴅ=${cuid}  ɴᴏ xꜱ`; }
                        else              { icon = "✅"; detail = `ᴜɪᴅ=${cuid}  ${arr.length} ᴋᴇʏꜱ  ${age}`; valid = true; }
                    }
                } catch (e) { icon = "❌"; detail = "ᴘᴀʀꜱᴇ ᴇʀʀᴏʀ: " + e.message.slice(0, 35); }
                const m    = mMap.get(c.file);
                const hp   = m ? `  ʜᴘ=${m.health}` : "";
                const lock = m?.isLocked    ? "  🔒 ʟᴏᴄᴋᴇᴅ"
                           : m?.onCooldown  ? `  ⏳ ᴄᴅ:${fmtDur(m.cooldownSecsLeft || 0)}`
                           : "";
                results.push({ file: c.file, icon, detail, valid, hp, lock });
            }
            const goodCount = results.filter(r => r.valid).length;
            const lines = results.flatMap(r => [
                `${r.icon} ${r.file}${r.hp}${r.lock}`,
                `   ↳ ${r.detail}`,
            ]);
            const hints = [];
            if (results.some(r => !r.valid)) hints.push(tip(`Fix: ${P}terminal cookie update accountN`));
            const locked = (mStats.accounts || []).filter(a => a.isLocked);
            if (locked.length) hints.push(tip(`Unlock: ${P}terminal account unlock accountN`));
            return reply(box("🍪 ᴄᴏᴏᴋɪᴇ ᴄʜᴇᴄᴋ", [
                row("#",  "ᴛᴏᴛᴀʟ",   results.length),
                row("✅", "ᴠᴀʟɪᴅ",   goodCount),
                row("❌", "ɪɴᴠᴀʟɪᴅ", results.length - goodCount),
                D2,
                ...lines,
                ...(hints.length ? [D2, ...hints] : []),
            ], goodCount ? `${goodCount}/${results.length} ʀᴇᴀᴅʏ` : "ɴᴏ ᴠᴀʟɪᴅ ᴄᴏᴏᴋɪᴇꜱ"));
        }

        if (op === "delete" || op === "del") {
            const a = parseAcctArg(rest[1] || "");
            if (!a) return reply(warn("ᴜꜱᴀɢᴇ › cookie delete accountN"));
            if (!fs.existsSync(a.file)) return reply(err(`${a.fname} ɴᴏᴛ ꜰᴏᴜɴᴅ`));
            try { fs.removeSync(a.file); return reply(ok(`${a.fname} ᴅᴇʟᴇᴛᴇᴅ`)); }
            catch (e) { return reply(err(e.message)); }
        }

        return reply(warn("ᴄᴏᴏᴋɪᴇ ᴏᴘꜱ › update · save · check · test · info · delete"));
    }

    if (sub === "account" || sub === "acct" || sub === "acc") {
        const op  = (rest[0] || "status").toLowerCase();
        const mgr = getMgr();

        if (op === "unlock" || op === "fix") {
            const a = parseAcctArg(rest[1]);
            if (!a) return reply(warn("ᴜꜱᴀɢᴇ › account unlock accountN"));
            if (!fs.existsSync(a.file)) return reply(err(`${a.fname} ɴᴏᴛ ꜰᴏᴜɴᴅ`));
            mgr?.unlockAccount?.(a.file);
            mgr?.boostAccount?.(a.file, 30);
            if (mgr?.accountCooldown) mgr.accountCooldown[a.file] = 0;
            return reply(ok(`${a.fname} ᴜɴʟᴏᴄᴋᴇᴅ\n• ᴄᴏᴏʟᴅᴏᴡɴ ᴄʟᴇᴀʀᴇᴅ\n• ʜᴇᴀʟᴛʜ +30\n• ɴᴏ ʀᴇꜱᴛᴀʀᴛ ɴᴇᴇᴅᴇᴅ`));
        }

        if (op === "boost" || op === "heal") {
            const a   = parseAcctArg(rest[1]);
            const amt = Math.max(1, Math.min(100, parseInt(rest[2], 10) || 50));
            if (!a) return reply(warn("ᴜꜱᴀɢᴇ › account boost accountN [amount]"));
            mgr?.boostAccount?.(a.file, amt);
            const newHp = Math.min(100, mgr?.health?.[a.file] ?? 0);
            return reply(ok(`${a.fname} ʜᴇᴀʟᴛʜ +${amt} → ${newHp}/100`));
        }

        if (op === "reset") {
            const a = parseAcctArg(rest[1]);
            if (!a) return reply(warn("ᴜꜱᴀɢᴇ › account reset accountN"));
            if (!fs.existsSync(a.file)) return reply(err(`${a.fname} ɴᴏᴛ ꜰᴏᴜɴᴅ`));
            mgr?.unlockAccount?.(a.file);
            mgr?.boostAccount?.(a.file, 100);
            if (mgr?.accountCooldown) mgr.accountCooldown[a.file] = 0;
            if (mgr?.failCount)  mgr.failCount[a.file]  = 0;
            if (mgr?.failType)   delete mgr.failType[a.file];
            if (mgr?.failReason) delete mgr.failReason[a.file];
            return reply(ok(`${a.fname} ꜰᴜʟʟʏ ʀᴇꜱᴇᴛ\n• ᴜɴʟᴏᴄᴋᴇᴅ  • ᴄᴏᴏʟᴅᴏᴡɴ ᴄʟᴇᴀʀᴇᴅ\n• ʜᴇᴀʟᴛʜ → 100  • ꜰᴀɪʟ ᴄᴏᴜɴᴛᴇʀ ᴄʟᴇᴀʀᴇᴅ`));
        }

        const s = mgr?.getStats?.();
        if (!s?.accounts?.length) return reply(warn("ɴᴏ ᴀᴄᴄᴏᴜɴᴛꜱ ʟᴏᴀᴅᴇᴅ ʏᴇᴛ."));
        const lines = [];
        for (const a of s.accounts) {
            const active = a.isCurrent ? " ◀ ᴀᴄᴛɪᴠᴇ" : "";
            const lock   = a.isLocked   ? "🔒 ʟᴏᴄᴋᴇᴅ"
                         : a.onCooldown ? `⏳ ᴄᴏᴏʟᴅᴏᴡɴ ${fmtDur(a.cooldownSecsLeft || 0)}`
                         : "🟢 ʀᴇᴀᴅʏ";
            lines.push(`${hpIcon(a.health)} ${a.name}${active}`);
            lines.push(`   ${scoreBar(a.health)}  ${lock}`);
            if (a.failType) lines.push(`   ↳ ꜰᴀɪʟ: ${a.failType} ×${a.failCount}`);
            lines.push(`   ↳ ꜱᴇɴᴛ: ${a.msgSent}  ᴏᴋ: ${a.successRate}%  ꜱᴇꜱꜱɪᴏɴꜱ: ${a.sessionCount}`);
            lines.push(D2);
        }
        lines.push(
            tip(`ᴜɴʟᴏᴄᴋ:  ${P}terminal account unlock accountN`),
            tip(`ʙᴏᴏꜱᴛ:   ${P}terminal account boost accountN`),
            tip(`ʀᴇꜱᴇᴛ:   ${P}terminal account reset accountN`),
            tip(`ᴄᴏᴏᴋɪᴇ:  ${P}terminal cookie update accountN`),
        );
        return reply(box("📊 ᴀᴄᴄᴏᴜɴᴛ ꜱᴛᴀᴛᴜꜱ", lines, `${s.accounts.length} ᴀᴄᴄᴏᴜɴᴛ(ꜱ)  ·  ꜱᴡɪᴛᴄʜᴇꜱ: ${s.switchCount}`));
    }

    if (sub === "restart" || sub === "reboot") return doRestart(reply, "");

    if (sub === "reset") {
        clearPref();
        try { require("../../core/auth/accountRegistry.js").resetFailedAccounts?.(); } catch {}
        return doRestart(reply, "ᴘɪɴ ᴄʟᴇᴀʀᴇᴅ + ᴄɪʀᴄᴜɪᴛ ʀᴇꜱᴇᴛ");
    }

    if (sub === "clear" || sub === "unpin") {
        clearPref();
        return reply(ok("ᴀᴄᴄᴏᴜɴᴛ ᴘɪɴ ᴄʟᴇᴀʀᴇᴅ."));
    }

    if (sub === "kill") {
        await reply(warn("⚠️  ᴋɪʟʟɪɴɢ ʙᴏᴛ — ɴᴏ ᴀᴜᴛᴏ-ʀᴇꜱᴘᴀᴡɴ!"));
        setTimeout(() => process.exit(0), 1500);
        return;
    }

    if (sub === "run" || sub === "use" || sub === "switch") {
        const target = (rest[0] || "").trim();
        if (!target) return reply(warn(`ᴜꜱᴀɢᴇ › run accountN\nᴇxᴀᴍᴘʟᴇ: ${P}tm run account2`));
        const m = target.match(/^account(\d+)(?:\.txt)?$/i);
        if (m) {
            const n    = parseInt(m[1]);
            const file = n === 1 ? "account.txt" : `account${n}.txt`;
            const full = path.join(ACCOUNTS_DIR, file);
            if (!fs.existsSync(full)) return reply(err(`${file} ɴᴏᴛ ꜰᴏᴜɴᴅ`));
            const hasContent = (() => {
                try { return fs.readFileSync(full, "utf8").trim().length > 10; } catch { return false; }
            })();
            if (!hasContent) return reply(err(`${file} ɪꜱ ᴇᴍᴘᴛʏ — ᴘᴀꜱᴛᴇ ᴄᴏᴏᴋɪᴇ ꜰɪʀꜱᴛ`));
            setPref(file);
            return doRestart(reply, `ꜱᴡɪᴛᴄʜᴇᴅ ᴛᴏ ${file}`);
        }
        if (/^\d{6,}$/.test(target)) {
            const cf = findCookieFileByUid(target);
            if (cf) { setPref(cf.file); return doRestart(reply, `ᴘɪɴɴᴇᴅ ${cf.file} (ᴜɪᴅ ${target})`); }
            return reply(err(`ɴᴏ ᴀᴄᴄᴏᴜɴᴛ ꜰᴏᴜɴᴅ ꜰᴏʀ ᴜɪᴅ ${target}`));
        }
        return reply(warn(`ᴜɴᴋɴᴏᴡɴ ᴛᴀʀɢᴇᴛ "${target}"\nᴜꜱᴇ accountN ꜰᴏʀᴍᴀᴛ`));
    }

    if (sub === "ping") {
        const t0   = Date.now();
        const lagT = performance.now();
        await new Promise(r => setImmediate(r));
        const lagMs = (performance.now() - lagT).toFixed(2);
        const res = await new Promise(resolve => {
            try {
                const https = require("https");
                const req = https.request("https://www.facebook.com/", { method: "HEAD" }, () =>
                    resolve({ ok: true, ms: Date.now() - t0 }));
                req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, err: "ᴛɪᴍᴇᴏᴜᴛ" }); });
                req.on("error", e => resolve({ ok: false, err: e.message }));
                req.end();
            } catch (e) { resolve({ ok: false, err: e.message }); }
        });
        if (!res.ok) return reply(err("ᴘɪɴɢ ꜰᴀɪʟᴇᴅ › " + res.err));
        const icon = res.ms < 400 ? "🟢" : res.ms < 1200 ? "🟡" : "🔴";
        return reply(box("🏓 ᴘɪɴɢ", [
            row(icon, "ꜰᴀᴄᴇʙᴏᴏᴋ",  `${res.ms} ᴍꜱ`),
            row("⏱️", "ᴇᴠᴇɴᴛ ʟᴀɢ", `${lagMs} ᴍꜱ`),
            row("#",  "ᴘɪᴅ",      String(process.pid)),
        ]));
    }

    if (sub === "logs" || sub === "log") {
        const n = Math.max(1, Math.min(80, parseInt(rest[0], 10) || 20));
        const f = await findLatestLog();
        if (!f) return reply(warn("ɴᴏ ʟᴏɢ ꜰɪʟᴇ ꜰᴏᴜɴᴅ."));
        return new Promise(rs => exec(`tail -n ${n} "${f}"`, (_, out) => {
            const txt = (out || "(ᴇᴍᴘᴛʏ)").slice(-1800);
            rs(reply(box(`📜 ʟᴏɢꜱ (ʟᴀꜱᴛ ${n})`, [
                row("▸", "ꜰɪʟᴇ", path.basename(f)),
                D2,
                ...txt.split("\n"),
            ])));
        }));
    }

    if (sub === "broadcast" || sub === "bc") {
        const msg = rest.join(" ").trim();
        if (!msg) return reply(warn("ᴜꜱᴀɢᴇ › broadcast <message>"));
        if (!api) return reply(err("ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ"));
        try {
            const list   = await new Promise((rs, rj) =>
                api.getThreadList(50, null, ["INBOX"], (e, x) => e ? rj(e) : rs(x)));
            const groups = list.filter(t => t.isGroup);
            if (!groups.length) return reply(warn("ɴᴏ ɢʀᴏᴜᴘꜱ ꜰᴏᴜɴᴅ ɪɴ ɪɴʙᴏx."));
            let sent = 0, failed = 0;
            for (const t of groups) {
                try {
                    await new Promise((rs, rj) =>
                        api.sendMessage(`📢 ${msg}`, t.threadID, e => e ? rj(e) : rs()));
                    sent++;
                } catch { failed++; }
                await new Promise(r => setTimeout(r, 600));
            }
            return reply(box("📢 ʙʀᴏᴀᴅᴄᴀꜱᴛ ᴄᴏᴍᴘʟᴇᴛᴇ", [
                row("👥", "ɢʀᴏᴜᴘꜱ",  groups.length),
                row("✅", "ꜱᴇɴᴛ",    sent),
                row("❌", "ꜰᴀɪʟᴇᴅ",  failed),
            ]));
        } catch (e) { return reply(err("ʙʀᴏᴀᴅᴄᴀꜱᴛ ᴇʀʀᴏʀ › " + e.message)); }
    }

    if (sub === "dm" || sub === "msg") {
        const uid = rest[0], msg = rest.slice(1).join(" ").trim();
        if (!uid || !msg) return reply(warn("ᴜꜱᴀɢᴇ › dm <uid> <message>"));
        if (!api) return reply(err("ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ"));
        return new Promise(rs => api.sendMessage(msg, uid, e =>
            rs(e ? reply(err("ꜱᴇɴᴅ ꜰᴀɪʟᴇᴅ › " + e.message)) : reply(ok(`ᴍᴇꜱꜱᴀɢᴇ ꜱᴇɴᴛ → ${uid}`)))
        ));
    }

    if (sub === "tid") {
        return reply(box("🆔 ᴛʜʀᴇᴀᴅ ɪɴꜰᴏ", [
            row("#",  "ᴛʜʀᴇᴀᴅ ɪᴅ", String(event.threadID || "?")),
            row("👤", "ꜱᴇɴᴅᴇʀ ɪᴅ", String(event.senderID || "?")),
            row("👥", "ɪꜱ ɢʀᴏᴜᴘ",  event.isGroup ? "ʏᴇꜱ" : "ɴᴏ"),
        ]));
    }

    if (sub === "threads") {
        const n = Math.max(5, Math.min(50, parseInt(rest[0], 10) || 15));
        if (!api) return reply(err("ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ"));
        try {
            const list = await new Promise((rs, rj) =>
                api.getThreadList(n, null, ["INBOX"], (e, x) => e ? rj(e) : rs(x)));
            if (!list?.length) return reply(warn("ɴᴏ ᴛʜʀᴇᴀᴅꜱ ꜰᴏᴜɴᴅ."));
            const lines = list.slice(0, n).map(t =>
                `${t.isGroup ? "👥" : "👤"} ${(t.name || "(ɴᴏ ɴᴀᴍᴇ)").slice(0, 26).padEnd(26)} ${t.threadID}`);
            return reply(box(`💬 ᴛʜʀᴇᴀᴅꜱ (${n})`, lines, `${list.length} ʟᴏᴀᴅᴇᴅ`));
        } catch (e) { return reply(err("ꜰᴀɪʟᴇᴅ › " + e.message)); }
    }

    if (sub === "who") {
        const mentioned = event.mentions ? Object.keys(event.mentions)[0] : null;
        const target = mentioned || rest[0];
        if (!target) return reply(warn("ᴜꜱᴀɢᴇ › who <uid>  ᴏʀ ᴍᴇɴᴛɪᴏɴ ꜱᴏᴍᴇᴏɴᴇ"));
        if (!api) return reply(err("ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ"));
        try {
            const r = await new Promise((rs, rj) =>
                api.getUserInfo(target, (e, x) => e ? rj(e) : rs(x)));
            const u = r?.[target];
            if (!u) return reply(warn(`ɴᴏ ᴜꜱᴇʀ ꜰᴏᴜɴᴅ ꜰᴏʀ ᴜɪᴅ ${target}`));
            return reply(box("👤 ᴜꜱᴇʀ ɪɴꜰᴏ", [
                row("#",  "ᴜɪᴅ",     target),
                row("👤", "ɴᴀᴍᴇ",    u.name       || "?"),
                row("🔗", "ᴘʀᴏꜰɪʟᴇ", u.profileUrl || "?"),
            ]));
        } catch (e) { return reply(err(e.message)); }
    }

    if (sub === "block") {
        const uid = (event.mentions ? Object.keys(event.mentions)[0] : null) || rest[0];
        if (!uid) return reply(warn("ᴜꜱᴀɢᴇ › block <uid>"));
        const list = blockedList();
        if (list.includes(String(uid))) return reply(warn(`${uid} ɪꜱ ᴀʟʀᴇᴀᴅʏ ʙʟᴏᴄᴋᴇᴅ.`));
        list.push(String(uid)); saveBlocked(list);
        return reply(ok(`${uid} ʙʟᴏᴄᴋᴇᴅ  (${list.length} ᴛᴏᴛᴀʟ)`));
    }

    if (sub === "unblock") {
        const uid = (event.mentions ? Object.keys(event.mentions)[0] : null) || rest[0];
        if (!uid) return reply(warn("ᴜꜱᴀɢᴇ › unblock <uid>"));
        const list = blockedList().filter(x => x !== String(uid));
        saveBlocked(list);
        return reply(ok(`${uid} ᴜɴʙʟᴏᴄᴋᴇᴅ  (${list.length} ʀᴇᴍᴀɪɴɪɴɢ)`));
    }

    if (sub === "blocked") {
        const list = blockedList();
        const lines = list.length ? list.map((x, i) => `  ${i + 1}. ${x}`) : ["(ɴᴏɴᴇ)"];
        return reply(box("🚫 ʙʟᴏᴄᴋᴇᴅ ᴜꜱᴇʀꜱ", lines, `${list.length} ᴜꜱᴇʀ(ꜱ)`));
    }

    if (sub === "backup") {
        const op = (rest[0] || "").toLowerCase();
        const BACKUP_DIR = path.join(process.cwd(), "core/data/backups");

        if (op === "list" || op === "ls") {
            let list = [];
            try {
                fs.ensureDirSync(BACKUP_DIR);
                list = fs.readdirSync(BACKUP_DIR)
                    .filter(f => f.endsWith(".json"))
                    .map(f => {
                        const fp = path.join(BACKUP_DIR, f);
                        let size = 0, mtime = 0;
                        try { const s = fs.statSync(fp); size = s.size; mtime = s.mtimeMs; } catch {}
                        return { name: f, size, mtime };
                    })
                    .sort((a, b) => b.mtime - a.mtime);
            } catch {}
            const lines = list.length ? list.slice(0, 12).map(b =>
                `  ${b.name.slice(0, 32).padEnd(32)}  ${fmtBytes(b.size)}  ${ageOf(b.mtime)}`)
                : ["(ɴᴏ ʙᴀᴄᴋᴜᴘꜱ ʏᴇᴛ)"];
            return reply(box("💾 ʙᴀᴄᴋᴜᴘꜱ", lines, `${list.length} ʙᴀᴄᴋᴜᴘ(ꜱ)`));
        }

        try {
            fs.ensureDirSync(BACKUP_DIR);
            const stamp  = new Date().toISOString().replace(/[:.]/g, "-");
            const name   = `backup-${stamp}.json`;
            const target = path.join(BACKUP_DIR, name);
            const snap   = {
                createdAt : new Date().toISOString(),
                botVersion: "GoatBot v2",
                cookies   : listCookieFiles().map(c => {
                    let raw = null;
                    try { raw = fs.readFileSync(path.join(ACCOUNTS_DIR, c.file), "utf8"); } catch {}
                    return { file: c.file, raw };
                }),
            };
            fs.outputJsonSync(target, snap, { spaces: 2 });
            const size = fs.statSync(target).size;
            return reply(ok(`ʙᴀᴄᴋᴜᴘ ꜱᴀᴠᴇᴅ\n• ꜰɪʟᴇ: ${name}\n• ꜱɪᴢᴇ: ${fmtBytes(size)}`));
        } catch (e) { return reply(err("ʙᴀᴄᴋᴜᴘ ꜰᴀɪʟᴇᴅ › " + e.message)); }
    }

    if (sub === "restore") {
        const name = rest[0];
        if (!name) return reply(warn(`ᴜꜱᴀɢᴇ › restore <name>\nꜱᴇᴇ: ${P}terminal backup list`));
        const BACKUP_DIR = path.join(process.cwd(), "core/data/backups");
        const fname = name.endsWith(".json") ? name : name + ".json";
        const file  = path.join(BACKUP_DIR, fname);
        if (!fs.existsSync(file)) return reply(err(`ɴᴏᴛ ꜰᴏᴜɴᴅ › ${name}`));
        try {
            const snap = fs.readJsonSync(file);
            if (!Array.isArray(snap.cookies)) throw new Error("ɪɴᴠᴀʟɪᴅ ʙᴀᴄᴋᴜᴘ ꜰᴏʀᴍᴀᴛ");
            let restored = 0;
            for (const c of snap.cookies) {
                if (!c.raw) continue;
                try { fs.writeFileSync(path.join(ACCOUNTS_DIR, c.file), c.raw); restored++; } catch {}
            }
            return reply(ok(`ʀᴇꜱᴛᴏʀᴇᴅ ꜰʀᴏᴍ ${path.basename(file)}\n• ${restored} ꜰɪʟᴇ(ꜱ) ʀᴇꜱᴛᴏʀᴇᴅ\nʀᴜɴ: ${P}terminal restart`));
        } catch (e) { return reply(err("ʀᴇꜱᴛᴏʀᴇ ꜰᴀɪʟᴇᴅ › " + e.message)); }
    }

    if (sub === "eval") {
        const code = rest.join(" ").trim();
        if (!code) return reply(warn("ᴜꜱᴀɢᴇ › eval <js code>"));
        let out;
        try {
            const result = await Promise.resolve(eval(`(async () => { ${code} })()`));
            out = result === undefined ? "(ᴜɴᴅᴇꜰɪɴᴇᴅ)" : typeof result !== "string"
                ? require("util").inspect(result, { depth: 3, compact: true }).slice(0, 1500)
                : result;
        } catch (e) {
            return reply(err(`ᴇᴠᴀʟ ᴇʀʀᴏʀ [${e.name}] › ${e.message}`));
        }
        return reply(box("✦ ᴇᴠᴀʟ", [String(out).slice(0, 1800)]));
    }

    if (sub === "exec" || sub === "sh") {
        let rawArgs = [...rest];
        let timeoutMs = 30000;
        if (rawArgs[0] && /^t=\d+$/i.test(rawArgs[0]))
            timeoutMs = Math.max(3000, Math.min(120000, parseInt(rawArgs.shift().split("=")[1], 10) * 1000));
        const cmd = rawArgs.join(" ").trim();
        if (!cmd) return reply(warn("ᴜꜱᴀɢᴇ › exec [t=<sec>] <shell command>"));
        for (const bad of SHELL_BLOCK)
            if (cmd.includes(bad)) return reply(err("ʙʟᴏᴄᴋᴇᴅ › ᴅᴀɴɢᴇʀᴏᴜꜱ ᴄᴏᴍᴍᴀɴᴅ ᴘᴀᴛᴛᴇʀɴ"));
        const t0 = Date.now();
        return new Promise(rs => exec(cmd, { cwd: process.cwd(), timeout: timeoutMs, maxBuffer: 1024 * 1024 * 4 },
            (e, stdout, stderr) => {
                const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
                const combined = [stdout || "", stderr ? `[ꜱᴛᴅᴇʀʀ]\n${stderr}` : ""]
                    .filter(Boolean).join("\n").trim();
                rs(reply(box(e ? "✗ ᴇxᴇᴄ" : "✓ ᴇxᴇᴄ", [
                    row("$",  "ᴄᴍᴅ",  cmd.slice(0, 80)),
                    row(e ? "🔴" : "🟢", "ᴇxɪᴛ", e ? String(e.code ?? "ᴇʀʀ") : "0"),
                    row("⏱️", "ᴛɪᴍᴇ", `${elapsed}ꜱ`),
                    D2,
                    ...(combined || "(ɴᴏ ᴏᴜᴛᴘᴜᴛ)").slice(0, 1800).split("\n"),
                ])));
            }
        ));
    }

    if (sub === "config" || sub === "cfg") {
        const cfgPath = path.join(process.cwd(), "config.json");
        const cfg = jread(cfgPath);
        if (!cfg) return reply(err("ᴄᴏᴜʟᴅ ɴᴏᴛ ʀᴇᴀᴅ config.json"));
        const key = rest[0], val = rest.slice(1).join(" ").trim();
        if (!key) {
            const lines = Object.entries(cfg)
                .filter(([k]) => !SECRET_RE.test(k))
                .map(([k, v]) => {
                    const display = typeof v === "object"
                        ? JSON.stringify(v).slice(0, 35) + (JSON.stringify(v).length > 35 ? "…" : "")
                        : String(v).slice(0, 40);
                    return row("▸", k.slice(0, 22), display);
                });
            return reply(box("🔧 ᴄᴏɴꜰɪɢ", lines, `${P}terminal config <key> [val] ᴛᴏ ᴇᴅɪᴛ`));
        }
        if (SECRET_RE.test(key)) return reply(err(`ᴄᴀɴɴᴏᴛ ᴀᴄᴄᴇꜱꜱ ꜱᴇᴄʀᴇᴛ ᴋᴇʏ "${key}"`));
        if (!val) {
            const cur = cfg[key];
            if (cur === undefined) return reply(warn(`ᴋᴇʏ "${key}" ɴᴏᴛ ꜰᴏᴜɴᴅ`));
            return reply(box(`🔧 ᴄᴏɴꜰɪɢ.${key}`, [row("▸", key, JSON.stringify(cur))]));
        }
        let parsed = val;
        if (val === "true")       parsed = true;
        else if (val === "false") parsed = false;
        else if (val === "null")  parsed = null;
        else if (!isNaN(Number(val)) && val !== "") parsed = Number(val);
        cfg[key] = parsed;
        if (!jwrite(cfgPath, cfg)) return reply(err("ᴄᴏɴꜰɪɢ ᴡʀɪᴛᴇ ꜰᴀɪʟᴇᴅ"));
        return reply(ok(`ᴄᴏɴꜰɪɢ ᴜᴘᴅᴀᴛᴇᴅ\n${key} = ${JSON.stringify(parsed)}`));
    }

    if (sub === "url" || sub === "dashboard" || sub === "dash") {
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
        const url = domain
            ? `https://${domain}`
            : `http://localhost:${process.env.PORT || 5000}`;
        return reply(box("🌐 ᴅᴀꜱʜʙᴏᴀʀᴅ ᴜʀʟ", [
            "ᴏᴘᴇɴ ᴛʜɪꜱ ʟɪɴᴋ ɪɴ ʏᴏᴜʀ ʙʀᴏᴡꜱᴇʀ:",
            "",
            url,
            "",
            "ᴏʀ ᴄʟɪᴄᴋ ᴛʜᴇ ᴘʀᴇᴠɪᴇᴡ ᴛᴀʙ ɪɴ ʀᴇᴘʟɪᴛ.",
        ]));
    }

    return reply(warn(`ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ: "${sub}"\nᴛʏᴘᴇ: ${P}terminal help`));
                        }
