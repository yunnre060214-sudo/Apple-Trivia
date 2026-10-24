# 设计研究与迭代记录

## v4.0 当前实现准则（2026-10-24）

保留每次访问的 hello、skip、产品自动轮播、产品浮动、背景光带及按钮原点的连续明暗扩散。首页采用四个分类入口，桌面横排、手机两列；产品画廊中的插图、年份与简介都能进入对应考点。

图片题在桌面采用插图与选项双列，在手机采用单列。产品图、接口示意和圈选标记属于题目信息，预留画布尺寸并提供文字描述。大面积背景光使用柔和径向渐变，移除实时模糊滤镜；产品特征演示只在主动悬停或键盘焦点时播放，减少动态效果时保持静态。深色图片画板降低亮度与饱和度，不反转产品颜色。

首页、答题、解析、成绩与分享共用排版、留白、边线和状态颜色。题目保留正文，辅助来源与图片说明按需呈现。分享后的同题挑战使用独立入口页，不向首页增加新的主操作。

以下材料保留 2026-10-17 首轮研究背景；当时的取舍不代表后续版本的最终行为。

研究日期：2026-10-17。对应发布：3.0.0。

## 方向与取舍

Apple Trivia 是点开即可玩的冷知识游戏。内容、品牌和交互应当形成自己的视觉语言。此次选择“产品档案与轻量游戏”：保留官方苹果轮廓与 hello 六色，将经典产品做成可浏览的矢量展陈，以排版与比例建立秩序。

研究材料用于指导设计判断。实验论文讨论特定样本中的第一印象与复杂度，不能据此证明本项目已经更美观；论坛体现参与者意见，不能当作普遍用户结论。最终的视觉评价仍需实际浏览、设备检查和用户反馈。

1. 主入口直接开局，首屏保持一个主按钮。首页不增加装饰段落、英文口号或引导性小字。
2. 标题、题干、选项、辅助控件各有明确层级。中文与拉丁字母分别调整展示字号；正文保留正常字距。
3. 六色成为小范围、可辨识的品牌签名。主要交互使用黑白，正确与错误仍使用独立的语义色。
4. 首页以原创产品形态提供特征，产品选择采用真实按钮。首轮以静态展陈为主，后续版本按用户要求加入自动轮播、持续浮动和背景流光。
5. 高频动作先响应，再以短过渡确认结果。页面切题保持上下文，明暗切换继续使用按钮原点扩散。
6. 新增的非必要动效支持减少动态效果；hello 每次访问播放，后续版本增加 skip 和 Escape 跳过。

## 研究索引

### 视觉感知与设计研究

1. [Tuch et al., 2012, The role of visual complexity and prototypicality](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)。摘要与研究结论显示，复杂度与典型性在很短曝光时间内影响美感评价。应用：保持熟悉的按钮与答题结构，将差异集中到构图和产品插画。
2. [Reinecke et al., CHI 2013, Predicting Users’ First Impressions of Website Aesthetics](https://wildlab.cs.washington.edu/Publications_files/Reinecke_CHI2013.pdf)。研究同时分析复杂度、色彩与个体差异。应用：优先控制视觉竞争，避免将“更多色彩”直接等同于“更高级”。
3. [NN/g, Visual Hierarchy in UX](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)。应用：通过字号、对比、邻近关系明确主次，减少相近权重的装饰块。
4. [NN/g, Aesthetic and Minimalist Design](https://www.nngroup.com/articles/aesthetic-minimalist-design/)。应用：保留完成任务所需的信息，将次要信息放进关于和自定义，减少首页噪声。
5. [NN/g, The Characteristics of Minimalism in Web Design](https://www.nngroup.com/articles/characteristics-minimalism/)。应用：留白应服务于层级与操作，移动端减少展示区高度，确保主入口先出现。
6. [NN/g, The Aesthetic-Usability Effect](https://www.nngroup.com/articles/aesthetic-usability-effect/)。应用：美感评价与功能验证分别记录，不能用漂亮的首屏掩盖切题和恢复进度问题。

### 排版与产品实践

7. [Apple WWDC20, The details of UI typography](https://developer.apple.com/videos/play/wwdc2020/10175/)。阅读文字实录。应用：字号、字重、行距共同构成层级，使用系统字体与等宽数字，展示字距与正文分别处理。
8. [Butterick, Typography in ten minutes](https://practicaltypography.com/typography-in-ten-minutes.html)。应用：先保证选项和解析的字号、行距与行长，再打磨大标题。其偏好专业字体的建议未直接采用，系统字体适合此项目的跨设备体验。
9. [Linear, How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)。应用：先统一基础视觉规则，再检查不同环境、外观和层级，避免逐个控件独立堆叠效果。
10. [Josh W. Comeau, Designing Beautiful Shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows/)。应用：统一物体的光源与阴影，产品插画使用相近的落地阴影；普通内容区不额外添加浮层阴影。

### 交互与动效

11. [Rauno Freiberg, Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design)。应用：保留空间方向、动作与反馈的连续关系，产品展陈响应指针但不改变点击目标。
12. [Emil Kowalski, Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations)。应用：切题使用明确方向与减速曲线，明暗扩散保留明确原点；减少不相关属性的同步动画。
13. [Emil Kowalski, You Don’t Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)。应用：高频切题缩短到 220ms，选答案仅更新状态，产品展陈不自动运动。
14. [Josh W. Comeau, An Interactive Guide to CSS Transitions](https://www.joshwcomeau.com/animation/css-transitions/)。应用：按下反馈、进入与位置变化分别选择时长，优先使用 transform 和 opacity。
15. [Build UI, Magnified Dock](https://buildui.com/recipes/magnified-dock)。应用：参考其指针位置与平滑响应关系，为展陈加入小幅透视；没有复制 Dock 外观，也没有引入运行时动画库。
16. [Google web.dev, How to create high-performance CSS animations](https://web.dev/articles/animations-guide)。应用：新增连续变化只修改 transform，逐帧循环在静止或离开页面后结束，不持续动画模糊与大面积阴影。
17. [Chrome Developers, Same-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)。应用：保留明暗快照的独立覆盖层，完成扩散后提交浏览器主题色；不支持时仍可切换外观。

### 响应式与可访问性

18. [Ahmad Shadeed, Defensive CSS](https://ishadeed.com/article/defensive-css/)。应用：网格使用 minmax(0,1fr)，可变文字容器设置 min-width:0，允许控件换行，避免固定内容高度，并预留滚动条位置。
19. [MDN, text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap)。应用：标题平衡换行，解析在支持的浏览器使用 pretty，普通换行仍可回退。
20. [MDN, oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch)。应用：通过明度与色度定义亮暗强调色，同时保留十六进制回退值。
21. [W3C, Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。应用：正文与辅助文字检查 4.5:1，展示大字检查 3:1；颜色之外同时保留状态符号与可读描述。
22. [W3C, Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。应用：理解规范的最低尺寸及间距例外，主要操作继续采用 44px 以上触控高度。
23. [W3C, Understanding Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)。应用：新动效跟随减少动态效果偏好，触屏不启动装饰性的指针透视。

### 论坛中的审美反馈

24. [r/UXDesign, How do you break out of the minimalism trap?](https://www.reddit.com/r/UXDesign/comments/1wfxcll/how_do_you_break_out_of_the_minimalism_trap_as_a/)。讨论提醒：极简的表面特征不能代替有意图的艺术方向。应用：经典产品、六色与档案构图形成内容相关的识别。
25. [r/web_design, Every Vibecoded websites looks the same](https://www.reddit.com/r/web_design/comments/1uzascg/every_vibecoded_websites_looks_the_same/)。讨论集中于重复构图、颜色与组件选择。应用：移除既有光晕、持续漂浮和同规格圆角分类卡，以展陈和连续横排重建首页。

## 迭代与验证边界

- 第一轮：统一暖白／石墨色、排版、细线、品牌签名与操作层级，重构首页、答题、结果、解析和对话框。
- 第二轮：原创产品 SVG 在明暗背景上逐一渲染检查；分享 Canvas 独立生成并检查，处理文字、边距和极端分数。
- 第三轮：检查产品选择、快速答题、解析暂停、恢复、自定义、练习确认、题目导航与外观切换；验证 2.2.3 存档兼容与构建产物。

本次托管预览服务因容器无法挂载 proc 而启动失败。没有用替代浏览器绕过环境限制。SVG 与 Canvas 的图像检查及模拟 DOM 流程验证，不代表完整浏览器布局和手机实机视觉验收。桌面与手机布局按相应断点实现，实际显示仍需后续正常浏览器复查。
