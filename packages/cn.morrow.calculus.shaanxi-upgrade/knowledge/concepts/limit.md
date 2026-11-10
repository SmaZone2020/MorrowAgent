---
id: calculus.limit
name: 极限存在的判定
chapter: calculus.chapter.function-and-limit
parent: calculus.limit.one-sided
tags:
  - limit
  - squeeze
difficulty: 3
exam_importance: critical
learning_objectives:
  - 能用左右极限相等判定双侧极限存在
  - 能用夹逼准则判定极限存在并求值
summary: 双侧极限存在的充要条件是左右极限都存在且相等；夹逼准则与单调有界准则给出不求出极限值也能判定存在的途径。
prerequisites:
  - calculus.limit.one-sided
sources:
  - source.textbook.tongji-7
---

# 极限存在的判定

有些极限算不出来也能判定它存在。夹逼准则与单调有界准则就是为此准备的：它们不要求求出极限值，只要求证明这个值被"夹住"或被"卡住"。

## 一、知识概述

判定极限存在有两条路。第一条是直接判定：左右极限都存在且相等。第二条是间接判定：不求出极限值，只用不等式证明它被两边逼近到同一个数（夹逼），或者证明它单调且有界（单调有界）。

## 二、核心定义

**夹逼准则**：若在 $a$ 的某去心邻域内

$$g(x)\le f(x)\le h(x)$$

且 $\lim\limits_{x\to a}g(x)=\lim\limits_{x\to a}h(x)=L$，则 $\lim\limits_{x\to a}f(x)=L$。

**单调有界准则**：单调递增且有上界（或单调递减且有下界）的数列必有极限。

两条准则的共同点是：它们只保证存在性，不给出极限值。要拿到值，还得另外计算。

## 三、性质与定理

使用夹逼准则时必须同时满足三点：

1. 上下界在**同一个趋近过程**下成立，不能一边用 $x\to a^-$ 一边用 $x\to a^+$；
2. 两端的极限**存在且相等**，只算出一端不够；
3. 不等式方向一致，放缩不能一会儿放大一会儿缩小。

## 四、公式与推导

一个典型用法是估计 $n$ 项和。记

$$S_n=\sum_{k=1}^{n}\frac{1}{\sqrt{n^2+k}}$$

和式共 $n$ 项，每项分母介于 $\sqrt{n^2+1}$ 与 $\sqrt{n^2+n}$ 之间，于是

$$\frac{n}{\sqrt{n^2+n}}\le S_n\le \frac{n}{\sqrt{n^2+1}}$$

两端分子分母同除以 $n$，得 $\dfrac{1}{\sqrt{1+\frac1n}}$ 与 $\dfrac{1}{\sqrt{1+\frac1{n^2}}}$，当 $n\to\infty$ 时都趋于 $1$。由夹逼准则，$S_n\to 1$。

注意项数 $n$ 必须一起进入估计：逐项取极限会得到 $0$，那是错的。

## 五、典型例题

求 $\lim\limits_{x\to 0}x\sin\dfrac{1}{x}$。

$\left|\sin\frac1x\right|\le 1$，故 $0\le\left|x\sin\frac1x\right|\le |x|$。$x\to 0$ 时两端都趋于 $0$，由夹逼准则极限为 $0$。

## 六、常见错误

- 只验证单侧极限就断言双侧极限存在。
- 使用夹逼准则时放缩方向不一致，上下界不是同一个量级。
- 处理 $n$ 项和时逐项取极限，忽略"无穷多项的无穷小之和未必是无穷小"。

## 七、前置知识

[左右极限](./limit-one-sided.md)：直接判定法完全依赖左右极限相等这一充要条件。

## 八、拓展内容

夹逼准则的难点不在结论，而在构造函数。常用的手段是找"最大项"与"最小项"：把和式每一项都替换成最大项得到上界，替换成最小项得到下界，两端化成同一个形状后再求极限。这一招在处理 $\sum\frac{1}{\sqrt{n^2+k}}$、$\sum\frac{k}{n^2+k}$ 这类问题时几乎通用。
