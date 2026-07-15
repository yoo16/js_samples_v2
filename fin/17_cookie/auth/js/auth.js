(() => {
    let csrfToken = null;
    const $ = (sel) => document.querySelector(sel);
    const out = (v) => { $("#out").textContent = JSON.stringify(v, null, 2); };

    // CSRFトークンを初期化
    initCsrf();

    // CSRFトークンを取得する
    async function initCsrf() {
        // api/csrf.php からCSRFトークンを取得
        const res = await fetch("./api/csrf.php", {
            // TODO: セッションCookie必須
            credentials: "include"
        });
        const data = await res.json();
        csrfToken = data.csrf_token;
    }

    async function postJSON(url, body) {
        const res = await fetch(url, {
            method: "POST",
            // TODO: CSRFトークンをヘッダーにセット
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

    async function getJSON(url) {
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
            // api/login.php へPOST
            const data = await postJSON("./api/login.php", { email, password });
            // データの中から、CSRFトークンを更新
            csrfToken = data.csrf_token || null;
            out(data);
        });

        // GET: api/me.php
        $("#me").addEventListener("click", async () => {
            const data = await getJSON("./api/me.php");
            out(data);
        });

        // POST: api/logout.php
        $("#logout").addEventListener("click", async () => {
            const data = await postJSON("./api/logout.php", {});
            out(data);
        });
    });
})();