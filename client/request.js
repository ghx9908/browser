const htmlparser2 = require("htmlparser2")
const http = require("http")
const main = require("./main.js")
const network = require("./network.js")
const render = require("./render.js")
const host = "localhost"
const css = require("css")
const port = 80
Array.prototype.top = function () {
  return this[this.length - 1]
}
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
  const headers = response.headers
  const contentType = headers["content-type"]
  if (contentType.indexOf("text/html") !== -1) {
    //1. 渲染进程把HTML转变为DOM树型结构
    const document = { type: "document", attributes: {}, children: [] }
    const cssRules = []
    const tokenStack = [document]
    const parser = new htmlparser2.Parser({
      onopentag(name, attributes = {}) {
        const parent = tokenStack.top()
        const element = {
          type: "element",
          tagName: name,
          children: [],
          attributes,
          parent,
        }
        parent.children.push(element)
        tokenStack.push(element)
      },
      ontext(text) {
        if (!/^[\r\n\s]*$/.test(text)) {
          const parent = tokenStack.top()
          const textNode = {
            type: "text",
            children: [],
            attributes: {},
            parent,
            text,
          }
          parent.children.push(textNode)
        }
      },
      /**
       * 在预解析阶段，HTML发现CSS和JS文件会并行下载，等全部下载后先把CSS生成CSSOM，然后再执行JS脚本
       * 然后再构建DOM树，重新计算样式，构建布局树，绘制页面
       * @param {*} tagname
       */
      onclosetag(tagname) {
        switch (tagname) {
          case "style":
            const styleToken = tokenStack.top()
            const cssAST = css.parse(styleToken.children[0].text)
            cssRules.push(...cssAST.stylesheet.rules)
            break
          default:
            break
        }
        tokenStack.pop()
      },
    })
    //开始接收响应体
    response.on("data", (buffer) => {
      //8.渲染进程开始HTML解析和加载子资源
      //网络进程加载了多少数据，HTML 解析器便解析多少数据。
      parser.write(buffer.toString())
    })
    response.on("end", () => {
      //7.HTML接收接受完毕后通知主进程确认导航
      main.emit("confirmNavigation")
      //3. 通过stylesheet计算出DOM节点的样式
      recalculateStyle(cssRules, document)
      console.dir(document, { depth: null })
      //触发DOMContentLoaded事件
      main.emit("DOMContentLoaded")
      //9.HTML解析完毕和加载子资源页面加载完成后会通知主进程页面加载完成
      main.emit("Load")
    })
  }
})

function recalculateStyle(cssRules, element, parentStyle = {}) {
  const attributes = element.attributes
  element.computedStyle = { color: parentStyle.color || "black" } //样式继承
  Object.entries(attributes).forEach(([key, value]) => {
    //应用样式表
    cssRules.forEach((rule) => {
      let selector = rule.selectors[0]
      if (
        (key === "id" && selector === "#" + value) ||
        (key === "class" && selector === "." + value)
      ) {
        rule.declarations.forEach(({ property, value }) => {
          if (property) element.computedStyle[property] = value
        })
      }
    })
    //行内样式
    if (key === "style") {
      const attributes = value.split(/;\s*/) //[background: green;]
      attributes.forEach((attribute) => {
        //background: green;
        const [property, value] = attribute.split(/:\s*/) //['background',green]
        if (property) element.computedStyle[property] = value
      })
    }
  })
  element.children.forEach((child) =>
    recalculateStyle(cssRules, child, element.computedStyle)
  )
}

//1.主进程接收用户输入的URL
main.emit("request", { host, port, path: "/index.html" })
