# FC26 进化中文名（fut.gg）

让 [fut.gg](https://www.fut.gg) 显示 **EA 官方简体中文**进化名称——
进化列表、详情页、[Evo Lab](https://www.fut.gg/evo-lab/) 全覆盖。

- ✅ 译名全部来自 **EA 官方**（游戏内 / FUT Web App 同款），不是机翻
- ✅ 中文为主，英文小字辅注，对照攻略不迷路
- ✅ 新进化译名**每周更新**，脚本自动获取，无需重装
- ✅ 没收录官方译名的进化保持英文原样，绝不瞎翻

## 安装（两步）

### 第 1 步：安装 Tampermonkey（油猴）

浏览器装一次即可：

- **Edge**（推荐，国内可直接访问商店）：
  [Edge 加载项商店 → Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd)
- **Chrome**：[Chrome 商店 → Tampermonkey](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)（需科学上网）

> ⚠️ **重要**：装好后需要开启浏览器的「开发者模式」，否则脚本不会运行：
> - **Edge**：地址栏输入 `edge://extensions` → 左侧打开「开发人员模式」
> - **Chrome**：地址栏输入 `chrome://extensions` → 右上角打开「开发者模式」
>
> 开完建议重启一次浏览器。这是浏览器对用户脚本的统一要求（MV3），不是本脚本特殊需求。

### 第 2 步：安装本脚本

点击安装链接，Tampermonkey 会弹出安装页，点「安装」即可：

**[➡️ 点此安装 fc-evo-zh](https://cdn.jsdelivr.net/gh/nagua77/fc-evo-zh@main/fc-evo-zh.user.js)**

装好后打开 [fut.gg/evolutions](https://www.fut.gg/evolutions/)，进化名称即显示官方中文。

## 常见问题

**Q：为什么个别进化还是英文？**
A：说明该进化的官方中文名还没收录（通常是刚上线）。我们每周更新数据，
脚本最迟 8 小时内自动拉取，不用做任何操作。也可以点 Tampermonkey
图标 → 「强制更新译名数据」立即刷新。

**Q：想暂时看英文原版？**
A：Tampermonkey 图标 → 「停用中文显示」，再点一次恢复。

**Q：译名来源是什么？**
A：全部采自 EA 官方（FC26 游戏内 / FUT Web App 中文界面），与游戏内显示一致。
脚本绝不使用机器翻译。

**Q：脚本安全吗？**
A：源码完全公开（就是本仓库的 `fc-evo-zh.user.js`，无压缩混淆），
只在 fut.gg 页面上运行，只读取一个公开的译名 JSON，不收集任何数据。

## 反馈

译名错误 / 页面没替换 / 其他问题，请提 [Issue](https://github.com/nagua77/fc-evo-zh/issues)。
