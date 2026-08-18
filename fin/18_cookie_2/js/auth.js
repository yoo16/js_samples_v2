(() => {
    let csrfToken = null;
    const $ = (sel) => document.querySelector(sel);
    const out = (v) => { $("#out").textContent = JSON.stringify(v, null, 2); };
    const csrfTokenElement = $("#csrf-token");
    const credentialsSelect = $("#credentials-select");
    const credentialsStatus = $("#credentials-status");
    const cookieStatus = $("#cookie-status");
    const sessionStatus = $("#session-status");

    const CREDENTIALS_DESCRIPTION = {
        omit: "omit — Cookie(sid)は送信されません。ログイン後も /me は401になるはずです",
        "same-origin": "same-origin — 同一オリジンなのでCookieは送信されます",
        include: "include — 同一・別オリジンいずれでもCookieの送信を試みます",
    };

    // 現在選択中の credentials モードを取得する
    function getCredentials() {
        return credentialsSelect ? credentialsSelect.value : "include";
    }

    // credentials 設定のステータス表示を更新する
    function updateCredentialsStatus() {
        const mode = getCredentials();
        if (credentialsStatus) {
            credentialsStatus.textContent = `現在: ${CREDENTIALS_DESCRIPTION[mode] ?? mode}`;
        }
    }

    // document.cookie に sid が実際に見えるかどうかでバッジを更新する
    function updateCookieStatus() {
        if (!cookieStatus) return;
        const visible = document.cookie.includes("sid=");
        if (visible) {
            cookieStatus.textContent = "見える（要注意）";
            cookieStatus.className = "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700";
        } else {
            cookieStatus.textContent = "不可視（HttpOnly）";
            cookieStatus.className = "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700";
        }
    }

    // ログイン状態のバッジを更新する
    function updateSessionStatus(state, label) {
        if (!sessionStatus) return;
        const styles = {
            authenticated: "bg-emerald-100 text-emerald-700",
            unauthenticated: "bg-slate-100 text-slate-600",
            unknown: "bg-slate-100 text-slate-500",
        };
        sessionStatus.textContent = label;
        sessionStatus.className = `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[state]}`;
    }

    // CSRFトークンを取得する
    async function initCsrf() {
        // api/csrf.php からCSRFトークンを取得
        // credentials を省略すると sid Cookie が送られず、
        // 毎回別セッション扱いになってトークンが一致しなくなる場合がある
        const res = await fetch("./api/csrf.php", { credentials: getCredentials() });
        const data = await res.json();
        csrfToken = data.csrf_token;
        csrfTokenElement.textContent = csrfToken;
    }

    // POSTでJSONを送信する
    async function postJSON(url, body) {
        const res = await fetch(url, {
            method: "POST",
            // CSRFトークンをヘッダーにセット
            headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
            },
            credentials: getCredentials(),
            body: JSON.stringify(body),
        });
        let data = await res.json();
        if (!res.ok) throw { status: res.status, data };
        return data;
    }

    // CSRFトークンを初期化
    initCsrf();
    updateCredentialsStatus();
    updateCookieStatus();
    updateSessionStatus("unknown", "未確認");

    window.addEventListener("DOMContentLoaded", () => {
        // credentials モードを切り替えたら、ステータス表示だけ即時更新する
        // （実際に反映されるのは次にLogin/Logout/`/me`を押したとき）
        if (credentialsSelect) {
            credentialsSelect.addEventListener("change", updateCredentialsStatus);
        }

        // POST: api/login.php
        $("#login").addEventListener("click", async () => {
            const email = $("#email").value;
            const password = $("#password").value;
            try {
                // api/login.php へPOST
                const data = await postJSON("./api/login.php", { email, password });
                // データの中から、CSRFトークンを更新
                csrfToken = data.csrf_token || null;

                csrfTokenElement.textContent = csrfToken;
                out(data);
                updateSessionStatus("authenticated", `ログイン中: ${email}`);
            } catch (err) {
                // 403 Invalid CSRF Token などのエラーもレスポンスとして画面に表示する
                out({ status: err.status, ...err.data });
                updateSessionStatus("unauthenticated", "未ログイン（ログイン失敗）");
            } finally {
                updateCookieStatus();
            }
        });

        // GET: api/me.php
        $("#me").addEventListener("click", async () => {
            // GETはCSRFトークン不要。sid Cookieを送るためcredentialsだけ指定する
            const res = await fetch("./api/me.php", { credentials: getCredentials() });
            const data = await res.json();
            out(data);
            if (res.ok && data.user) {
                updateSessionStatus("authenticated", `ログイン中: ${data.user.email}`);
            } else {
                updateSessionStatus("unauthenticated", "未ログイン（401）");
            }
            updateCookieStatus();
        });

        // POST: api/logout.php
        $("#logout").addEventListener("click", async () => {
            try {
                const data = await postJSON("./api/logout.php", {});
                out(data);
                // logout.phpはセッションを丸ごと破棄するのでCSRFトークンも失効する
                // → 次のログインに備えて新しいトークンを取得し直す
                await initCsrf();
                updateSessionStatus("unauthenticated", "未ログイン（ログアウト済み）");
            } catch (err) {
                out({ status: err.status, ...err.data });
            } finally {
                updateCookieStatus();
            }
        });

        // document.cookie をそのまま画面に表示する
        // HttpOnly なCookie（sid）はここに出てこない
        $("#show-cookie").addEventListener("click", () => {
            $("#cookie-view").textContent = document.cookie || "（空 — HttpOnlyなCookieはJSから読めません）";
            updateCookieStatus();
        });
    });
})();
