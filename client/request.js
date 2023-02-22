const http = require("http")
const main = require("./main.js")
const network = require("./network.js")
const render = require("./render.js")
const host = "localhost"
const port = 80

/** 浏览器主进程 **/
main.on("request", function (options) {
  //2.主进程把该URL转发给网络进程
  network.emit("request", options)
})
//开始准备渲染页面
main.on("prepareRender", function (response) {
  //5.主进程发送提交导航消息到渲染进程
  render.emit("commitNavigation", response)
})
main.on("confirmNavigation", function () {
  console.log("confirmNavigation")
})
main.on("DOMContentLoaded", function () {
  console.log("DOMContentLoaded")
})
main.on("Load", function () {
  console.log("Load")
})

/** 网络进程 **/
network.on("request", function (options) {
  //3.在网络进程中发起URL请求
  let request = http.request(options, (response) => {
    //4.网络进程接收到响应头数据并转发给主进程
    main.emit("prepareRender", response)
  })
  //结束请求体
  request.end()
})

/** 渲染进程 **/
//6.渲染进程开始从网络进程接收HTML数据
render.on("commitNavigation", function (response) {
  //开始接收响应体
  const buffers = []
  response.on("data", (buffer) => {
    //8.渲染进程开始HTML解析和加载子资源
    buffers.push(buffer)
  })
  response.on("end", () => {
    let resultBuffer = Buffer.concat(buffers)
    let html = resultBuffer.toString()
    console.log(html)
    //7.HTML接收接受完毕后通知主进程确认导航
    main.emit("confirmNavigation", html)
    //触发DOMContentLoaded事件
    main.emit("DOMContentLoaded", html)
    //9.HTML解析完毕和加载子资源页面加载完成后会通知主进程页面加载完成
    main.emit("Load")
  })
})

//1.主进程接收用户输入的URL
main.emit("request", { host, port, path: "/index.html" })