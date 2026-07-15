(() => {
    const $ = (sel) => document.querySelector(sel);

    window.addEventListener("DOMContentLoaded", () => {
        // XSS攻撃の例
        $("#draftBtn").addEventListener("click", () => {
            const content = $("#content").value;
            // alert(content);
            $("#out").innerHTML = content;
        });

        $("#rewrite").addEventListener("click", () => {
            document.cookie = "sid=xxxxxx; path=/";
            $("#out").innerHTML = document.cookie;
        });
    });
})();