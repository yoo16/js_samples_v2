(() => {
    let csrfToken = null;
    const $ = (sel) => document.querySelector(sel);
    const out = (v) => { $("#out").textContent = JSON.stringify(v, null, 2); };
    const csrfTokenElement = $("#csrf-token");

    // CSRFトークンを初期化
    initCsrf();

    // CSRFトークンを取得する
    async function initCsrf() {
        // api/csrf.php からCSRFトークンを取得
        // credentials: "include" を指定しないと sid Cookie が送られず、
        // 毎回別セッション扱いになってトークンが一致しなくなる
        const res = await fetch("./api/csrf.php", { credentials: "include" });
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
            credentials: "include",
            body: JSON.stringify(body),
        });
        let data = await res.json();
        if (!res.ok) throw { status: res.status, data };
        return data;
    }

    window.addEventListener("DOMContentLoaded", () => {
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
            } catch (err) {
                // 403 Invalid CSRF Token などのエラーもレスポンスとして画面に表示する
                out({ status: err.status, ...err.data });
            }
        });

        // GET: api/me.php
        $("#me").addEventListener("click", async () => {
            // GETはCSRFトークン不要。sid Cookieを送るためcredentialsだけ指定する
            const res = await fetch("./api/me.php", { credentials: "same-origin" });
            out(await res.json());
        });

        // POST: api/logout.php
        $("#logout").addEventListener("click", async () => {
            try {
                const data = await postJSON("./api/logout.php", {});
                out(data);
                // logout.phpはセッションを丸ごと破棄するのでCSRFトークンも失効する
                // → 次のログインに備えて新しいトークンを取得し直す
                await initCsrf();
            } catch (err) {
                out({ status: err.status, ...err.data });
            }
        });

        // document.cookie をそのまま画面に表示する
        // HttpOnly なCookie（sid）はここに出てこない
        $("#show-cookie").addEventListener("click", () => {
            $("#cookie-view").textContent = document.cookie || "（空 — HttpOnlyなCookieはJSから読めません）";
        });
    });
})();