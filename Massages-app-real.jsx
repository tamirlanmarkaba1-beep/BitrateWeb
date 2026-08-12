import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  UserPlus, MessageSquare, Settings, Sun, Moon, X, Check, Send,
  Users, Camera, User as UserIcon, AtSign, RefreshCw
} from "lucide-react";

function pairKey(a, b) {
  return "msg:" + [a, b].sort().join("__");
}

function Avatar({ name, color, src, size = 40, online }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-semibold overflow-hidden"
        style={{
          background: src ? "transparent" : `linear-gradient(135deg, ${color || "#8b5cf6"}, #4c1d95)`,
          color: "#fff",
          fontSize: size * 0.38,
        }}
      >
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials}
      </div>
      {online !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
          style={{
            width: size * 0.32,
            height: size * 0.32,
            background: online ? "#4ade80" : "#6b7280",
            borderColor: "var(--panel)",
          }}
        />
      )}
    </div>
  );
}

export default function MessagesApp() {
  const [theme, setTheme] = useState("dark");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState({ username: "", nickname: "", avatar: null });
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [friends, setFriends] = useState([]); // [{username, nickname}]
  const [activeUsername, setActiveUsername] = useState(null);
  const [messages, setMessages] = useState([]); // current conversation
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [addedToast, setAddedToast] = useState("");
  const [draft, setDraft] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState("");

  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  const isLight = theme === "light";
  const vars = isLight
    ? { bg: "#f4f2fb", panel: "#ffffff", panel2: "#ede9fb", text: "#1b1330", muted: "#6c6486", border: "#e2ddf5" }
    : { bg: "#0a0812", panel: "#130f1f", panel2: "#1c1730", text: "#f3f0fa", muted: "#9c93b5", border: "#26203b" };

  // ---------- load profile + friends on start ----------
  useEffect(() => {
    (async () => {
      try {
        const p = await window.storage.get("profile", false);
        if (p?.value) {
          const parsed = JSON.parse(p.value);
          setProfile(parsed);
          await registerInDirectory(parsed.username, parsed.nickname);
          await loadFriends();
        }
      } catch (e) {
        // no profile yet
      }
      setReady(true);
    })();
  }, []);

  async function registerInDirectory(username, nickname) {
    try {
      await window.storage.set(`directory:${username}`, JSON.stringify({ username, nickname }), true);
      let idxRaw = null;
      try {
        idxRaw = await window.storage.get("directory:index", true);
      } catch (e) {}
      let idx = [];
      try {
        idx = idxRaw?.value ? JSON.parse(idxRaw.value) : [];
      } catch (e) {
        idx = [];
      }
      if (!idx.includes(username)) {
        idx.push(username);
        await window.storage.set("directory:index", JSON.stringify(idx), true);
      }
    } catch (e) {
      setStorageError("Не удалось подключиться к общему хранилищу.");
    }
  }

  async function loadFriends() {
    try {
      const f = await window.storage.get("friends", false);
      if (f?.value) setFriends(JSON.parse(f.value));
    } catch (e) {
      setFriends([]);
    }
  }

  async function saveFriends(list) {
    setFriends(list);
    try {
      await window.storage.set("friends", JSON.stringify(list), false);
    } catch (e) {
      setStorageError("Не удалось сохранить список друзей.");
    }
  }

  async function createProfile() {
    const uname = usernameInput.trim().toLowerCase().replace(/\s+/g, "");
    if (!uname) {
      setUsernameError("Введите юзернейм");
      return;
    }
    if (!/^[a-z0-9_.]{3,20}$/.test(uname)) {
      setUsernameError("3-20 символов: латиница, цифры, _ .");
      return;
    }
    const newProfile = { username: uname, nickname: uname, avatar: null };
    try {
      await window.storage.set("profile", JSON.stringify(newProfile), false);
      setProfile(newProfile);
      await registerInDirectory(uname, uname);
      await loadFriends();
    } catch (e) {
      setUsernameError("Ошибка сохранения профиля, попробуйте ещё раз.");
    }
  }

  // ---------- search directory ----------
  async function runSearch(q) {
    setQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const idxRaw = await window.storage.get("directory:index", true);
      const idx = idxRaw?.value ? JSON.parse(idxRaw.value) : [];
      const matches = idx.filter(
        (u) => u.includes(q.trim().toLowerCase()) && u !== profile.username && !friends.some((f) => f.username === u)
      );
      const results = [];
      for (const uname of matches.slice(0, 8)) {
        try {
          const d = await window.storage.get(`directory:${uname}`, true);
          if (d?.value) results.push(JSON.parse(d.value));
        } catch (e) {}
      }
      setSearchResults(results);
    } catch (e) {
      setSearchResults([]);
    }
  }

  async function addFriend(u) {
    const list = [...friends, u];
    await saveFriends(list);
    setAddedToast(`${u.username} добавлен в друзья`);
    setQuery("");
    setSearchResults([]);
    setTimeout(() => setAddedToast(""), 2500);
  }

  // ---------- conversation ----------
  const loadMessages = useCallback(async () => {
    if (!activeUsername || !profile.username) return;
    setSyncing(true);
    try {
      const key = pairKey(profile.username, activeUsername);
      const res = await window.storage.get(key, true);
      const list = res?.value ? JSON.parse(res.value) : [];
      setMessages(list);
    } catch (e) {
      setMessages([]);
    }
    setSyncing(false);
  }, [activeUsername, profile.username]);

  useEffect(() => {
    loadMessages();
    clearInterval(pollRef.current);
    if (activeUsername) {
      pollRef.current = setInterval(loadMessages, 2500);
    }
    return () => clearInterval(pollRef.current);
  }, [activeUsername, loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || !activeUsername) return;
    const key = pairKey(profile.username, activeUsername);
    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const newMsg = { id: Date.now(), from: profile.username, text: draft.trim(), time };
    try {
      const res = await window.storage.get(key, true);
      const list = res?.value ? JSON.parse(res.value) : [];
      const updated = [...list, newMsg];
      await window.storage.set(key, JSON.stringify(updated), true);
      setMessages(updated);
      setDraft("");
    } catch (e) {
      try {
        await window.storage.set(key, JSON.stringify([newMsg]), true);
        setMessages([newMsg]);
        setDraft("");
      } catch (e2) {
        setStorageError("Не удалось отправить сообщение.");
      }
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const updated = { ...profile, avatar: reader.result };
      setProfile(updated);
      try {
        await window.storage.set("profile", JSON.stringify(updated), false);
        await window.storage.set(`directory:${updated.username}`, JSON.stringify({ username: updated.username, nickname: updated.nickname }), true);
      } catch (e2) {}
    };
    reader.readAsDataURL(file);
  }

  async function saveNickname(nickname) {
    const updated = { ...profile, nickname };
    setProfile(updated);
    try {
      await window.storage.set("profile", JSON.stringify(updated), false);
      await window.storage.set(`directory:${updated.username}`, JSON.stringify({ username: updated.username, nickname }), true);
    } catch (e) {}
  }

  const activeFriend = friends.find((f) => f.username === activeUsername);

  if (!ready) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: "#0a0812", color: "#9c93b5" }}>
        Загрузка...
      </div>
    );
  }

  // ---------- onboarding screen ----------
  if (!profile.username) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ background: "#0a0812", color: "#f3f0fa", fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600&display=swap'); .font-display{font-family:'Sora',sans-serif;}`}</style>
        <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#130f1f" }}>
          <div className="font-display font-extrabold text-2xl mb-1" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Добро пожаловать
          </div>
          <p className="text-sm mb-4" style={{ color: "#9c93b5" }}>
            Придумайте юзернейм — по нему вас смогут найти и добавить в друзья другие люди, открывшие эту же ссылку.
          </p>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: "#1c1730" }}>
            <AtSign size={16} color="#9c93b5" />
            <input
              autoFocus
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(""); }}
              onKeyDown={(e) => e.key === "Enter" && createProfile()}
              placeholder="ваш_юзернейм"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          {usernameError && <div className="text-xs mb-3" style={{ color: "#fb7185" }}>{usernameError}</div>}
          <button
            onClick={createProfile}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
          >
            Продолжить
          </button>
          <p className="text-xs mt-4" style={{ color: "#6c6486" }}>
            Чтобы переписываться, отправьте эту же ссылку собеседнику — пусть он тоже выберет юзернейм и добавит вас через поиск.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ "--panel": vars.panel, background: vars.bg, color: vars.text, fontFamily: "'Inter', system-ui, sans-serif" }}
      className="w-full h-screen flex overflow-hidden"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Sora', sans-serif; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${vars.border}; border-radius: 8px; }
      `}</style>

      <div
        className="w-16 flex flex-col items-center py-4 gap-3 shrink-0"
        style={{ background: isLight ? "#efe9fc" : "#0d0a18", borderRight: `1px solid ${vars.border}` }}
      >
        <button
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-display font-bold"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#4c1d95)" }}
          title="Друзья"
        >
          <Users size={20} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setTheme(isLight ? "dark" : "light")}
          className="w-11 h-11 rounded-2xl flex items-center justify-center hover:opacity-80 transition"
          style={{ background: vars.panel2, color: vars.text }}
          title="Тема"
        >
          {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center hover:opacity-80 transition"
          style={{ background: vars.panel2, color: vars.text }}
          title="Настройки"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="w-72 flex flex-col shrink-0" style={{ background: vars.panel, borderRight: `1px solid ${vars.border}` }}>
        <div className="p-3" style={{ borderBottom: `1px solid ${vars.border}` }}>
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }}
          >
            <UserPlus size={16} /> Добавить друга
          </button>
        </div>
        <div className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide font-display" style={{ color: vars.muted }}>
          ДРУЗЬЯ — {friends.length}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {friends.length === 0 && (
            <div className="text-xs text-center mt-6 px-4" style={{ color: vars.muted }}>
              Пока никого нет. Нажмите «Добавить друга» и найдите по юзернейму.
            </div>
          )}
          {friends.map((f) => (
            <button
              key={f.username}
              onClick={() => setActiveUsername(f.username)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl mb-1 text-left transition"
              style={{ background: activeUsername === f.username ? vars.panel2 : "transparent" }}
            >
              <Avatar name={f.nickname} color="#a78bfa" size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.nickname}</div>
                <div className="text-xs truncate" style={{ color: vars.muted }}>@{f.username}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-2.5 flex items-center gap-2" style={{ background: vars.panel2, borderTop: `1px solid ${vars.border}` }}>
          <Avatar name={profile.nickname} src={profile.avatar} color="#8b5cf6" size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{profile.nickname}</div>
            <div className="text-xs truncate" style={{ color: vars.muted }}>@{profile.username}</div>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: vars.muted }}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeFriend ? (
          <>
            <div
              className="h-16 flex items-center justify-between px-5 shrink-0"
              style={{ borderBottom: `1px solid ${vars.border}`, background: vars.panel }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={activeFriend.nickname} color="#a78bfa" size={34} />
                <div>
                  <div className="font-semibold font-display">{activeFriend.nickname}</div>
                  <div className="text-xs" style={{ color: vars.muted }}>@{activeFriend.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: vars.muted }}>
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "синхронизация..." : "обновляется каждые 2.5с"}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="m-auto text-center" style={{ color: vars.muted }}>
                  <MessageSquare className="mx-auto mb-2" size={28} />
                  <div>Начните переписку с {activeFriend.nickname}</div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === profile.username ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[65%] px-4 py-2 rounded-2xl text-sm"
                    style={
                      m.from === profile.username
                        ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", borderBottomRightRadius: 4 }
                        : { background: vars.panel2, borderBottomLeftRadius: 4 }
                    }
                  >
                    {m.text}
                    <div className="text-[10px] mt-1 opacity-70">{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${vars.border}` }}>
              <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{ background: vars.panel2 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Написать ${activeFriend.nickname}...`}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: vars.text }}
                />
                <button onClick={sendMessage} className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="m-auto text-center" style={{ color: vars.muted }}>
            Выберите друга слева
          </div>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: vars.panel }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-lg">Добавить друга</div>
              <button onClick={() => setAddOpen(false)} style={{ color: vars.muted }}><X size={20} /></button>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: vars.panel2 }}>
              <AtSign size={16} style={{ color: vars.muted }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Введите юзернейм..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: vars.text }}
              />
            </div>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
              {query.trim() && searchResults.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: vars.muted }}>
                  Никого не найдено. Человек должен сначала сам открыть эту ссылку и создать юзернейм.
                </div>
              )}
              {searchResults.map((u) => (
                <div key={u.username} className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ background: vars.panel2 }}>
                  <Avatar name={u.nickname} color="#8b5cf6" size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{u.nickname}</div>
                    <div className="text-xs" style={{ color: vars.muted }}>@{u.username}</div>
                  </div>
                  <button
                    onClick={() => addFriend(u)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>
            {addedToast && (
              <div className="mt-3 text-sm flex items-center gap-2" style={{ color: "#4ade80" }}>
                <Check size={16} /> {addedToast}
              </div>
            )}
            <p className="text-xs mt-4" style={{ color: vars.muted }}>
              Отправьте собеседнику ссылку на этот же артефакт — без этого он не появится в поиске.
            </p>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: vars.panel }}>
            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-lg">Настройки</div>
              <button onClick={() => setSettingsOpen(false)} style={{ color: vars.muted }}><X size={20} /></button>
            </div>

            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="relative">
                <Avatar name={profile.nickname} src={profile.avatar} color="#8b5cf6" size={80} />
                <label
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  <Camera size={14} color="#fff" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="text-xs" style={{ color: vars.muted }}>Нажмите на камеру, чтобы сменить аватар</div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold" style={{ color: vars.muted }}>Никнейм</label>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mt-1" style={{ background: vars.panel2 }}>
                  <UserIcon size={16} style={{ color: vars.muted }} />
                  <input
                    value={profile.nickname}
                    onChange={(e) => saveNickname(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: vars.text }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl px-3 py-3 mt-1" style={{ background: vars.panel2 }}>
                <div className="flex items-center gap-2 text-sm">
                  {isLight ? <Sun size={16} /> : <Moon size={16} />}
                  Светлая тема
                </div>
                <button
                  onClick={() => setTheme(isLight ? "dark" : "light")}
                  className="w-11 h-6 rounded-full relative transition"
                  style={{ background: isLight ? "#a855f7" : "#3a3355" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: isLight ? 22 : 2 }}
                  />
                </button>
              </div>

              <div className="text-xs px-1" style={{ color: vars.muted }}>
                Ваш юзернейм: <b>@{profile.username}</b> (не меняется)
              </div>
            </div>

            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            >
              Готово
            </button>
          </div>
        </div>
      )}

      {storageError && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-xl text-sm z-50" style={{ background: "#f43f5e", color: "#fff" }}>
          {storageError}
        </div>
      )}
    </div>
  );
}
