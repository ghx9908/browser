## 1. 进程架构

### 1.1 进程和线程

- 当启动一个程序时，操作系统会为该程序分配内存，用来存放代码、运行过程中的数据，这样的运行环境叫做`进程`
- 一个进程可以启动和管理多个线程，线程之间可以共享进行数据，任何一个线程出错都可能会导致进程崩溃

### 1.2 Chrome 的进程架构

- 浏览器主进程 负责界面显示、用户交互和子进程管理
- 渲染进程 排版引擎和 V8 引擎运行在该进程中，负责把 HTML、CSS 和 JavaScript 转变成网页
- 网络进程 用来加载网络资源的
- GPU 进程 用来实现 CSS3 和 3D 效果

## 2. 加载 HTML

- (1)主进程接收用户输入的 URL
- (2)主进程把该 URL 转发给网络进程
- (3)在网络进程中发起 URL 请求
- (4)网络进程接收到响应头数据并转发给主进程
- (5)主进程发送提交导航消息到渲染进程
- (6)渲染进程开始从网络进程接收 HTML 数据
- (7)HTML 接收接受完毕后通知主进程确认导航
- (8)渲染进程开始 HTML 解析和加载子资源
- (9)HTML 解析完毕和加载子资源页面加载完成后会通知主进程页面加载完成

## 3. 渲染流水线

- （1) 渲染进程把 HTML 转变为 DOM 树型结构
- （2) 渲染进程把 CSS 文本转为浏览器中的`stylesheet`
- （3) 通过 stylesheet 计算出 DOM 节点的样式
- （4) 根据 DOM 树创建布局树
- （5) 并计算各个元素的布局信息
- （6) 根据布局树生成分层树
- （7) 根据分层树进行生成绘制步骤
- （8) 把绘制步骤交给渲染进程中的合成线程进行合成
- （9) 合成线程将图层分成图块(tile)
- （10) 合成线程会把分好的图块发给栅格化线程池，栅格化线程会把图片(tile)转化为位图
- （11) 而其实栅格化线程在工作的时候会把栅格化的工作交给 GPU 进程来完成，最终生成的位图就保存在了`GPU`内存中
- （12) 当所有的图块都光栅化之后合成线程会发送绘制图块的命令给浏览器主进程
- （13) 浏览器主进程然后会从 GPU 内存中取出位图显示到页面上

### 3.1 HTML 转 DOM 树

- 浏览器中的 HTML 解析器可以把 HTML 字符串转换成 DOM 结构
- HTML 解析器边接收网络数据边解析 HTML
- 解析 DOM
  - HTML 字符串转 Token
  - Token 栈用来维护节点之间的父子关系，Token 会依次压入栈中
  - 如果是开始标签，把 Token 压入栈中并且创建新的 DOM 节点并添加到父节点的 children 中
  - 如果是文本 Token，则把文本节点添加到栈顶元素的 children 中，文本 Token 不需要入栈
  - 如果是结束标签，此开始标签出栈

### 3.2 CSS 转 stylesheet

- 渲染进程把 CSS 文本转为浏览器中的`stylesheet`
- CSS 来源可能有 link 标签、style 标签和 style 行内样式
- 渲染引擎会把 CSS 转换为`document.styleSheets`

### 3.3 计算出 DOM 节点的样式

- 根据 CSS 的继承和层叠规则计算 DOM 节点的样式
- DOM 节点的样式保存在了`ComputedStyle`中

### 3.4 创建布局树

- 创建一棵只包含可见元素的布局树

![](https://raw.githubusercontent.com/Gao-Hongxiang/image-hosting/master/img/20230222182009.png)

### 3.5 计算布局

- 计算各个元素的布局
