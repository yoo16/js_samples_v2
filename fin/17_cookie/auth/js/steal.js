(() => {
    const $ = (sel) => document.querySelector(sel);

    window.addEventListener("DOMContentLoaded", () => {
        // XSS攻撃の例
        $("#draftBtn").addEventListener("click", async () => {
            const content = $("#content").value;
            $("#out").innerHTML = content;

            const res = await fetch("./api/csrf.php", {
                // TODO: セッションCookie必須
                credentials: "include"
            })
            const data = await res.json();
        });

        $("#rewrite").addEventListener("click", () => {
            document.cookie = "sid=session haking!!!; path=/";
            $("#out").innerHTML = document.cookie;
        });
    });
})();