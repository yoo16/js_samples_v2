// TODO: JSの復習: id=message に「はじめます」を表示
document.getElementById("message").textContent =  "はじめます";

// TODO: jQueryで、DOM読み込み後にアラート表示
// 1) jqdoc と入力
// 2) 「jqDocReadyShort」を選択
$(function () {
    alert("完了！！！")
});

alert("はじまるよ！");

// TODO:DOM読み込み前の処理: アラートで「はじまるよ」を表示

// バニラJSで、DOM読み込み後にアラート表示
// 「DOMContentLoaded」の場合
document.addEventListener("DOMContentLoaded", function () {
    alert("バニラJS")
})