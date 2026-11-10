---
id: calculus.derivative.high-order
name: 高阶导数
chapter: calculus.chapter.derivative
tags:
  - derivative
  - high-order
difficulty: 4
exam_importance: medium
learning_objectives:
  - 能求出常见函数的二阶与三阶导数
  - 能用归纳法写出简单函数的 n 阶导数
summary: 高阶导数是对导数再次求导得到的函数，二阶导数刻画函数图象的凹凸性，也可用于判断极值。
prerequisites:
  - calculus.derivative.rules
sources:
  - source.textbook.tongji-7
---

# 高阶导数

对导数再求一次导，得到二阶导数。阶数越高，计算的重复性越强，所以这一类题的关键是找规律，而不是一次次硬求。

## 一、知识概述

$f''(x)$ 描述的是"变化率的变化率"。它在几何上决定曲线是向上弯还是向下弯，在物理上对应加速度，在极值判定中用来区分极大与极小。

## 二、核心定义

$$f''(x)=\lim_{\Delta x\to 0}\frac{f'(x+\Delta x)-f'(x)}{\Delta x}$$

一般地，$f$ 的 $n$ 阶导数记作 $f^{(n)}(x)$ 或 $\dfrac{d^ny}{dx^n}$。

## 三、性质与定理

- **二阶导数的符号决定凹凸**：$f''(x)>0$ 时曲线是凹的（开口向上），$f''(x)<0$ 时是凸的。
- **极值的第二判定法**：$f'(x_0)=0$ 且 $f''(x_0)<0$ 时取极大值；$f''(x_0)>0$ 时取极小值。
- **莱布尼茨公式**：$(uv)^{(n)}=\sum_{k=0}^{n}\binom{n}{k}u^{(k)}v^{(n-k)}$，处理乘积的高阶导数。

## 四、公式与推导

求 $y=e^{2x}$ 的 $n$ 阶导数。逐次求导：

$$y'=2e^{2x},\quad y''=4e^{2x},\quad y'''=8e^{2x}$$

每求一次导就多乘一个 $2$，故 $y^{(n)}=2^n e^{2x}$。归纳的落点是"每层都乘同一个常数"，一旦看出这一点就不必真算出前十阶。

## 五、典型例题

求 $y=\sin x$ 的四阶导数。

$y'=\cos x$，$y''=-\sin x$，$y'''=-\cos x$，$y^{(4)}=\sin x$。四阶之后回到原函数，说明 $\sin$ 的高阶导数以 $4$ 为周期循环。

## 六、常见错误

- 求高阶导数时漏掉常数因子，例如把 $(e^{2x})''$ 写成 $e^{2x}$。
- 把二阶导数的记号写成平方，$f''(x)$ 与 $[f(x)]^2$ 毫无关系。
- 只机械求导不找规律，导致 $n$ 阶导数无法写出通项。

## 七、前置知识

[求导法则](./derivative-rules.md)：每一阶都要用到四则与链式法则。

## 八、拓展内容

常见函数的 $n$ 阶导数值得记住几个：$(e^{ax})^{(n)}=a^n e^{ax}$，$(\sin ax)^{(n)}=a^n\sin\left(ax+\frac{n\pi}{2}\right)$，$\left(\frac{1}{x+a}\right)^{(n)}=\frac{(-1)^n n!}{(x+a)^{n+1}}$。记住它们，比每次从头归纳快得多。
