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
        // TODO: セッションCookie(sid)を一緒に送るよう credentials を設定する
        //       ヒント: "same-origin" または "include"
        const res = await fetch("./api/csrf.php", {
            credentials: "omit"
        });
        const data = await res.json();
        csrfToken = data.csrf_token;
        csrfTokenElement.textContent = csrfToken;
    }

    // POSTでJSONを送信する
    async function postJSON(url, body) {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // TODO: CSRFトークンをヘッダーにセットする（キー名: X-CSRF-Token）
                //       ヒント: csrfToken が入っていればスプレッド構文で追加する
            },
            // TODO: セッションCookie(sid)を送れるよう credentials を設定する
            credentials: "omit",
            body: JSON.stringify(body),
        });
        let data = await res.json();
        if (!res.ok) throw { status: res.status, data };
        return data;
    }

    async function getJSON(url) {
        // GETリクエストはCookie(sid)を送るだけでよく、CSRFトークンは不要
        const res = await fetch(url, {
            credentials: "same-origin",
        });
        const data = await res.json();
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
            const data = await getJSON("./api/me.php");
            out(data);
        });

        // POST: api/logout.php
        $("#logout").addEventListener("click", async () => {
            try {
                const data = await postJSON("./api/logout.php", {});
                out(data);
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