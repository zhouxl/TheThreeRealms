# V1.5 · 文昌帝君静态 GLB 技术验证

本阶段新增能由 Three.js 直接加载的 glTF 2.0 GLB **静态雕塑**，取代此前的程序化几何神像。它是资产接入与空间/持物方向的技术验证，**不是通过文化审校的正式道教造像**。

## 资产交付

| 项目 | 位置 / 约定 |
|---|---|
| 二进制 GLB | `public/models/wenchang-deity-tech-demo.glb` |
| 可复现生成器 | `scripts/generateWenchangDeityGLB.mjs` |
| 重建命令 | `npm run assets:deity-demo` |
| 主节点 | `WenchangRoot`，原点为底座接地位置 |
| 高度 | 含台座及冠冕，恰好 2.85m |
| 模型朝向 | 面朝 +Z（前庭）；本人右手在 -X，左手在 +X |
| 持物节点 | `RightHand → WritingBrush`、`LeftHand → Scroll` |
| 外观 | 旧木台座、朱红与青色交领袍服、冠冕、长须、手持笔与卷轴 |
| 材质 | 九组基础 PBR 纯色材质，没有外部纹理或贴图 |

## 使用与回退

没有定义 `VITE_DEITY_GLB_URL` 时使用内置技术 GLB。可以在 `.env.local` 写：

```dotenv
# 禁用正式渲染器，显示旧程序化神像
VITE_DEITY_GLB_URL=
```

正式模型应放到 `public/models/wenchang.glb`，使用 `VITE_DEITY_GLB_URL=/models/wenchang.glb`。改完环境变量要重启 `npm run dev`。

GLB 下载失败、缺少命名节点、左右手坐标约定不符时自动回退并在 Console 报告原因。

## 验收场景

1. 进入场景，看殿内正面雕像是否完整，冠顶不进入梁/屋顶。
2. 从正面、左前、右前及背面近距离观察：笔在神像自身右手，卷在左手；**注意面对神像时观察者的左右与神像相反**。
3. 切换 `VITE_DEITY_GLB_URL=` 对比新 GLB 与原程序化占位，恢复默认后再次检查。
4. 上香、求签、挂福的操作不应改变，香炉不应遮挡雕像主要面容。
5. `npm run ci:local`：先确认全部单测、GLTFLoader 实际二进制解析和构建都 PASS，然后观察页面实际渲染。将 `.local-ci/last-run.log` 回传。

## 未完成

静态技术雕塑没有雕刻纹理、复杂面部细节、服饰 UV、真实木器漆画质感或文化审校；移动设备帧率、真实浏览器阴影与摄像机遮挡还没被自动测试。制作最终美术时，应有雕塑与文化方向的联合审查。
