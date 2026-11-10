---
id: calculus.derivative.rules
name: 求导法则
chapter: calculus.chapter.derivative
tags:
  - derivative
  - rules
difficulty: 3
exam_importance: critical
learning_objectives:
  - 能对复合函数按链式法则逐层求导
  - 能处理乘积与商的混合求导
summary: 四则运算、复合函数与反函数的求导法则把基本初等函数的导数扩展为一般初等函数的导数计算。
prerequisites:
  - calculus.derivative
sources:
  - source.textbook.tongji-7
---

# 求导法则

基本初等函数的导数是"零件"，求导法则是"装配规则"。真正容易出错的不是公式本身，而是链式法则里内层导数有没有乘上。

## 一、知识概述

求导法则把"会求 $\sin x$ 的导数"扩展成"会求 $\sin(2x^2+1)$ 的导数"。四则法则处理结构，链式法则处理嵌套，反函数法则把 $\arcsin$、$\ln$ 这类函数的导数从原函数反推出来。

## 二、核心定义

**四则法则**：

$$(u\pm v)'=u'\pm v',\quad (uv)'=u'v+uv',\quad \left(\frac uv\right)'=\frac{u'v-uv'}{v^2}\ (v\ne 0)$$

**链式法则**：若 $y=f(u)$、$u=g(x)$，则

$$\frac{dy}{dx}=\frac{dy}{du}\cdot\frac{du}{dx}=f'(g(x))\cdot g'(x)$$

## 三、性质与定理

- **商的求导顺序不能反**：分子是 $u'v-uv'$，写成 $uv'-u'v$ 会整体差一个负号。
- **链式法则逐层展开**：$y=\sin(\ln x)$ 先对 $\sin$ 求导得 $\cos(\ln x)$，再乘内层 $\ln x$ 的导数 $\frac1x$。
- **反函数法则**：$[f^{-1}(y)]'=\dfrac{1}{f'(x)}$，其中 $y=f(x)$。由此得到 $(\ln x)'=\frac1x$、$(\arcsin x)'=\frac{1}{\sqrt{1-x^2}}$。

## 四、公式与推导

求 $y=\ln\sin(3x)$ 的导数。

外层是 $\ln$，导数为 $\dfrac{1}{\sin 3x}$；中间层是 $\sin$，导数为 $\cos 3x$；内层是 $3x$，导数为 $3$。三层相乘：

$$y'=\frac{1}{\sin 3x}\cdot\cos 3x\cdot 3=3\cot 3x$$

## 五、典型例题

求 $y=\dfrac{x^2+1}{x-1}$ 的导数。

按商的法则，$u=x^2+1$、$v=x-1$：

$$y'=\frac{2x(x-1)-(x^2+1)\cdot 1}{(x-1)^2}=\frac{2x^2-2x-x^2-1}{(x-1)^2}=\frac{x^2-2x-1}{(x-1)^2}$$

## 六、常见错误

- 链式法则漏乘内层导数，例如把 $(\sin 2x)'$ 写成 $\cos 2x$。
- 商的求导法则分子顺序写反，符号整体出错。
- 多层嵌套时只展开一层就停手。

## 七、前置知识

[导数的定义](./derivative.md)：所有法则都是定义式的推论。

## 八、拓展内容

对数求导法在幂指函数上特别好用：$y=x^x$ 两边取对数得 $\ln y=x\ln x$，再对 $x$ 求导得 $\frac{y'}{y}=\ln x+1$，于是 $y'=x^x(\ln x+1)$。直接套公式反而绕远。
