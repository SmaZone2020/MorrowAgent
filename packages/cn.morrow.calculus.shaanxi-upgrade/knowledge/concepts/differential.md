---
id: calculus.differential
name: 微分
chapter: calculus.chapter.derivative
tags:
  - differential
  - linearization
difficulty: 3
exam_importance: high
learning_objectives:
  - 能写出微分的表达式并求出一元函数的微分
  - 能区分函数改变量、微分与近似值
summary: 函数的微分是函数改变量的线性主部，等于导数与自变量微分的乘积；一元函数中可导与可微互为充要条件。
prerequisites:
  - calculus.derivative
sources:
  - source.textbook.tongji-7
---

# 微分

微分回答的是另一个问题：自变量变化一点点，函数值大约变化多少？答案就是"导数乘以自变量的改变量"，这个近似在几何上等于切线代替曲线。

## 一、知识概述

导数是"变化率"，微分类似"变化量"。二者关系是 $dy=f'(x)\,dx$，所以知道导数就立即知道微分；反过来，微分形式的不变性是求复合函数微分和积分换元的底层依据。

## 二、核心定义

设 $y=f(x)$ 在 $x$ 处可导，$\Delta x$ 是自变量的改变量。若

$$\Delta y=f'(x)\Delta x+o(\Delta x)$$

则称 $f'(x)\Delta x$ 为 $f$ 在 $x$ 处的微分，记作

$$dy=f'(x)\,dx$$

其中 $dx=\Delta x$。

关键在于"线性主部"：$\Delta y$ 里真正起作用的是线性项 $f'(x)\Delta x$，剩下的 $o(\Delta x)$ 在 $\Delta x\to 0$ 时相对可忽略。

## 三、性质与定理

- **一元函数中可导与可微等价**：$f$ 在 $x$ 可导 $\iff$ $f$ 在 $x$ 可微。
- **微分形式不变性**：无论 $u$ 是自变量还是中间变量，都有 $dy=f'(u)\,du$。这条性质是凑微分法的基础。
- **近似计算**：$f(x_0+\Delta x)\approx f(x_0)+f'(x_0)\Delta x$，误差是 $\Delta x$ 的高阶无穷小。

## 四、公式与推导

若 $y=\sin(2x+1)$，则

$$dy=\cos(2x+1)\cdot d(2x+1)=2\cos(2x+1)\,dx$$

这里先对 $\sin$ 求微分得到 $\cos(u)\,du$，再把 $du=2\,dx$ 代回。微分形式不变性让这两步可以一路写下来，不必中途切换到导数记号。

## 五、典型例题

求 $y=x^2$ 在 $x=1$、$\Delta x=0.01$ 处的 $\Delta y$ 与 $dy$，并比较。

$\Delta y=(1.01)^2-1=0.0201$，$dy=2\cdot 1\cdot 0.01=0.02$。两者相差 $0.0001$，即 $o(\Delta x)$ 那一部分，说明小改变量下用 $dy$ 近似 $\Delta y$ 是可靠的。

## 六、常见错误

- 把微分写成函数值本身，而不是线性主部。
- 忽略一元函数中可导与可微的等价性，误以为存在"可导但不可微"的一元函数。
- 复合函数微分时忘乘内层微分，与链式法则漏乘是同一个错误。

## 七、前置知识

[导数的定义](./derivative.md)：微分的表达式直接以导数为基础。

## 八、拓展内容

一元函数里可导与可微等价，多元函数里两者却分道扬镳：偏导数存在并不保证可微。这个反差说明"线性主部"才是微分的本质，"偏导数存在"只是必要条件。
