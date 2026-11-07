# V1.4｜小旅人 GLB 技术验证资产

## 做到了什么

此批次交付了真正可解析的 glTF 2.0 二进制角色资产，具备骨骼、蒙皮权重及关键帧动画，可替换此前的程序化小旅人。**模型是为管线验证制作的低多边形技术资产，不是最终国风美术。**

- 文件：`public/models/traveler-tech-demo.glb`
- 源码：`scripts/generateTravelerGLB.mjs`
- 重生成：`npm run assets:demo`
- 加载：默认启用；`.env.local` 中 `VITE_TRAVELER_GLB_URL=` 可禁用，`VITE_TRAVELER_GLB_URL=/models/custom.glb` 可替换
- 背面、动作、手部握香等需要在浏览器中实际观察；CI 的二进制结构检查不能替代画面检查

## 资产验证内容

1. GLB 魔数、版本、JSON/BIN Chunk 有效；提交的二进制与脚本生成物完全一致
2. 带蒙皮 Mesh 的 JOINTS_0 / WEIGHTS_0 属性完整，11 个骨骼映射正确
3. 名字为 `Idle`, `Walk`, `HoldIncense`, `Bow`, `PlaceIncense` 的动画剪辑存在且有采样曲线
4. `IncenseGrip` 是 `Hand_R` 后代，持香几何与发烟点随它运动
5. 模型单位为米，根节点在脚底，顶部约 1.55 m

## 下一步真实美术所需

交给美术师的正式角色要求仍按 `docs/ASSET_CONTRACT.md` 执行：4.8 头身、国风交领常服、束发、纹理 UV、PBR 贴图、稳定骨骼拓扑、手指握持与香接触，以及动作节奏、镜头、低端手机的实际测试。

本资源采用无外部纹理的材质与简单几何，不适合直接作为最终上线资产。
