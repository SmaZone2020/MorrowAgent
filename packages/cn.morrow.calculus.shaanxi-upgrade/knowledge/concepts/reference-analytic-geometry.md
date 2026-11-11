---
id: calculus.book.reference.analytic-geometry
name: "空间解析几何"
chapter: calculus.book.reference
tags:
  - geometry
  - notes
difficulty: 3
exam_importance: high
learning_objectives:
  - "能写出空间平面与直线的方程，并判断位置关系"
summary: "由向量代数推出平面方程、直线方程与二次曲面，是空间问题的坐标化工具。"
sources:
  - source.notes.personal
version: 1.0.0
---
### 1.平面方程

**一般式方程**
$$
Ax+By+Cz+D=0
$$
其中A、B、C不同时为零，向量$\vec n=\{A,B,C\}$称做平面的法向量（垂直于平面）。

**点法式方程**

过定点$M(x_0,y_0,z_0)$，以$\vec n=\{A,B,C\}$为法向量的平面方程为
$$
A(x-x_0)+B(y-y_0)+C(z-z_0)=0
$$
**常见平面方程**

1）过原点的平面：$Ax+By+Cz=0$

2）与$x$轴平行的平面：$By+Cz+D=0$

3）与$y$轴平行的平面：$Ax+Cz+D=0$

4）与$z$轴平行的平面：$Ax+By+D=0$

5）与$xoy$平面平行的平面：$z=D$

6）与$xoz$平面平行的平面：$y=D$

7）与$yoz$平面平行的平面：$x=D$



### 2.直线方程

**一般式方程**
$$
\begin{cases}
A_1x+B_1y+C_1z+D_1=0
\\\\
A_2x+B_2y+C_2z+D_2=0
\end{cases}
$$
其中两个平面不平行，即方程系数不对应成比例。

**标准式方程（点法式方程）**

过点$M_0(x_0,y_0,z_0)$且平行于向量$\vec S =\{m,n,p\}$的直线方程
$$
\frac {x-x_0}{m}=\frac {y-y_0}{n}=\frac {z-z_0}{p}
$$
其中向量$\vec S$称为直线的方向向量。

**一般式转点法式**
$$
\begin{vmatrix}
   i & j & k \\
   A_1 & B_1 & C_1 \\
   A_2 & B_2 & C_2
  \end{vmatrix}
  =
 \begin{vmatrix}
   B_1 & C_1 \\
   B_2 & C_2
  \end{vmatrix}i
  -
 \begin{vmatrix}
   A_1 & C_1 \\
   A_2 & C_2
  \end{vmatrix}j
  +
 \begin{vmatrix}
   A_1 & B_1 \\
   A_2 & B_2
  \end{vmatrix}k
  =(B_1C_2-B_2C_1)i+(-1)(A_1C_2-A_2C_1)j+(A_1B_2-A_2B_1)k
$$
则直线的方向向量$\vec s =\{(B_1C_2-B_2C_1),(-1)(A_1C_2-A_2C_1),(A_1B_2-A_2B_1)\}$，再取直线上某一特定点，即可求出点法式。



### 3.垂直与平行

**两个平面之间的特殊位置关系**

设两个平面分别为$\pi_1:A_1x+B_1y+C_1z+D_1=0,\pi_2:A_2x+B_2y+C_2z+D_2=0$，则

1）$\pi_1 \bot \pi_2 \Leftrightarrow  A_1A_2+B_1B_2+C_1C_2=0$，即两个法向量垂直（或称正交）；

2）$\pi_1 // \pi_2 \Leftrightarrow  \frac{A_1}{A_2}=\frac{B_1}{B_2}=\frac{C_1}{C_2}$，即称两个法向量对应成比例（或称平行）。

**两条直线之间的特殊位置关系**

设有两条直线$l_1:\frac{x-x_1}{m_1}=\frac{y-y_1}{n_1}=\frac{z-z_1}{p_1},l_2:\frac{x-x_2}{m_2}=\frac{y-y_2}{n_2}=\frac{z-z_2}{p_2}$，则

1）$l_1 \bot l_2 \Leftrightarrow  m_1m_2+n_1n_2+p_1p_2=0$，即两条直线的方向向量垂直（或称正交）；

2）$l_1 // l_2 \Leftrightarrow  \frac{m_1}{m_2}=\frac{n_1}{n_2}=\frac{p_1}{p_2}$，即称两条直线的方向向量对应成比例（或称平行）。

**直线与平面的特殊位置关系**

设直线$l:\frac{x-x_0}{m}=\frac{y-y_0}{n}=\frac{z-z_0}{p}$，平面$\pi:Ax+By+Cz+D=0$，则

1）$l // \pi\Leftrightarrow Am+Bn+Cp=0$，即$l$的方向向量与$\pi$的法向量垂直；

2）$l \bot \pi\Leftrightarrow \frac Am=\frac Bn=\frac Cp$，，即𝑙的方向向量与𝜋的法向量平行。



### 4.二次曲面

**柱面方程**

沿平行于$z$轴移动：$F(x,y)=0$

沿平行于$x$轴移动：$F(y,z)=0$

沿平行于$y$轴移动：$F(x,z)=0$

**球面方程**
$$
(x-x_0)^2+(y-y_0)^2+(z-z_0)^2=R^2
$$
该方程表示以$(x_0,y_0,z_0)$为球心，以R为半径的球面；特别的$x^2+y^2+z^2=R^2$表示原点为$(0,0,0)$，半径为$R$。

**椭球面方程**
$$
\frac{(x-x_0)^2}{a^2}+\frac{(y-y_0)^2}{b^2}+\frac{(z-z_0)^2}{c^2}=1,其中a>0,b>0,c>0
$$
该方程表示以$(x_0,y_0,z_0)$为中心，$a,b,c$为轴长的椭球面；特别的$\frac{x^2}{a^2}+\frac{y^2}{b^2}+\frac{z^2}{c^2}=1$表示原点为$(0,0,0)$的椭球面。

**旋转面方程**

旋转抛物面（垂直于$z$轴）：$x^2+y^2=z$

旋转抛物面（垂直于$x$轴）：$y^2+z^2=x$

旋转抛物面（垂直于$y$轴）：$x^2+z^2=y$

**二次锥面**
$$
\frac {x^2}{a^2}+\frac {y^2}{b^2}-\frac {z^2}{c^2}=0
$$
**单叶双曲面**
$$
\frac {x^2}{a^2}+\frac {y^2}{b^2}-\frac {z^2}{c^2}=1
$$
**双叶双曲面**
$$
\frac {x^2}{a^2}+\frac {y^2}{b^2}-\frac {z^2}{c^2}=-1
$$
**抛物面**

椭圆抛物面：$\frac {x^2}{a^2}+\frac {y^2}{b^2}=z$

双曲抛物面：$\frac {x^2}{a^2}-\frac {y^2}{b^2}=z$
