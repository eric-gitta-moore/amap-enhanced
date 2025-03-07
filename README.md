# amap-enhanced

[🚀 立即体验](#安装方法) · [📖 使用文档](#使用说明) · [🤝 参与贡献](CONTRIBUTING.md)

## ✨ 功能预览

高德地图增强插件 - 为高德地图网页版添加更多实用功能，增加图形绘制编辑、收藏增强、骑行导航预估...

<table>
  <thead>
    <tr>
      <th align=center colspan=2><b>🧐一睹为快～</b></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/0056a13c-d3b2-4cd5-93a4-9fa53025da0a" /></td>
      <td><img src="https://github.com/user-attachments/assets/96924455-9af8-413b-a811-e1065229dc11" /></td>
    </tr>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/e5c38086-cfba-4887-bc2c-3115bdbe2167" /></td>
      <td><img src="https://github.com/user-attachments/assets/2b051984-d5a5-40f3-89c8-532c3a79f0fa" /></td>
    </tr>
  </tbody>
</table>


## 功能特性

- 🎨 地图绘制工具
  - 支持绘制标记点、线段、多边形、矩形、圆形等图形
  - 所有图形支持拖拽调整
  - 圆形绘制时实时显示半径信息

- 📸 收藏增强
  - 支持在收藏点中同步 APP 端图片
  - 图片支持点击预览
  - 添加收藏图片列表的滚动条样式

- 🚲 路线规划增强
  - 支持骑行导航
  - 显示骑行距离和预计时间
  - 房补预测更方便

- 🛠 其他功能
  - 支持测量面积
  - 支持自定义备注
  - 支持收藏点置顶
  - 右键获取鼠标所在经纬度

## 安装方法

**注意事项**
- **⚠ 使用正式版 (GitHub 源) 和预览版须翻墙.**
- Tampermonkey 和 Tampermonkey BETA 都可以

| 正式版 (jsDelivr 源)          | 正式版 (GitHub 源)                                 | 预览版                                            |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| [安装](https://cdn.jsdelivr.net/gh/eric-gitta-moore/amap-enhanced@main/src/amap.user.js) | [安装](https://raw.githubusercontent.com/eric-gitta-moore/amap-enhanced/main/src/amap.user.js) | [安装](https://raw.githubusercontent.com/eric-gitta-moore/amap-enhanced/main/src/amap.user.js) |


1. 安装 [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey-beta/gcalenpjmijncebpfijmoaglllgpjagf) 浏览器扩展
2. 点击上面任意一个正式版
3. 安装即可
4. 打开 [高德地图](https://www.amap.com/)，即可看到增强功能

## 使用说明

### 绘制工具

- 在地图上选择需要绘制的图形类型
- 点击地图开始绘制
- 绘制完成后可拖拽调整位置和形状

### 编辑标记
- 通常**完成编辑的最后一步是双击**，否则会继续绘制
- 右键元素可以删除、编辑
- 按 `ESC` 完成/退出编辑
- 多边形编辑删除点位，需要双击该点

### 收藏功能

- 点击地点的收藏按钮添加到收藏夹
- 在收藏列表中可以添加图片和备注
- 支持将重要的收藏点置顶显示
- [增加修改收藏地点 or 图片](#收藏显示)

### 路线规划
- 右键设置起点和终点
- 左上角路线面板选择交通方式
- hover 或者 click 可以查看路线详情

## 数据存储
- 使用浏览器本地存储 (localStorage) 存储收藏数据，key 为 `SAVE_DATA_STORAGE_KEY`
- 数据格式为 JSON，包含地点的经纬度、名称、图片、备注等信息
- 支持导入和导出收藏数据

## 参与项目
欢迎参考[代码贡献指南](CONTRIBUTING.md)来为项目添砖加瓦~

## 开源协议

本项目基于 MIT 协议开源。

## FAQ
### 为什么搜索不了地点，无法点击建筑物，提示 "抱歉，此地暂无详细信息！"
<img width="313" alt="image" src="https://github.com/user-attachments/assets/a9955a6e-bc29-4857-824a-fb4409081e1b" />

> 暂时无解～ 高德地图 Web API 有调用频率限制应该是，暂时没找到解法
```json
{
    "ret": [
        "FAIL_SYS_USER_VALIDATE",
        "RGV587_ERROR::SM::哎哟喂,被挤爆啦,请稍后重试"
    ],
    "data": {
        "url": "https://www.amap.com:443//service/poiInfo/_____tmd_____/punish?x5secdata=xxx&x5step=2&action=captcha&pureCaptcha="
    }
}
```

### 收藏显示
> **管理收藏**需要前往高德地图 APP 操作

<table>
  <thead>
    <tr>
      <th align=center colspan=2><b>管理收藏</b></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img style="width: 300px;" src="https://github.com/user-attachments/assets/156b45ea-bde6-4a7c-9d69-4d43a27a461a" /></td>
      <td><img style="width: 300px;" src="https://github.com/user-attachments/assets/58033b34-1d2e-4328-9075-3afa4bb32613" /></td>
    </tr>
  </tbody>
</table>
