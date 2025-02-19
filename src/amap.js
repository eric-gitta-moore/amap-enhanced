// ==UserScript==
// @name         高德地图请求拦截
// @namespace    https://eric-gitta-moore.github.io/
// @version      2025-02-18
// @description  拦截并修改高德地图的请求响应
// @author       https://eric-gitta-moore.github.io/
// @match        https://www.amap.com/*
// @icon         https://a.amap.com/pc/static/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  //#region library
  // 请求拦截器注册中心
  const interceptorRegistry = {
    xhr: [],
    fetch: [],
  };

  // 注册XHR拦截器
  function registerXHRInterceptor(checker, handler) {
    interceptorRegistry.xhr.push({
      checker: checker,
      handler: handler,
    });
  }

  // 注册Fetch拦截器
  function registerFetchInterceptor(checker, handler) {
    interceptorRegistry.fetch.push({
      checker: checker,
      handler: handler,
    });
  }

  // 执行XHR拦截器
  function executeXHRInterceptors(xhr) {
    if (xhr.responseType === "" || xhr.responseType === "text") {
      for (const interceptor of interceptorRegistry.xhr) {
        if (interceptor.checker(xhr)) {
          const response = interceptor.handler(xhr);
          if (response) {
            Object.defineProperty(xhr, "response", {
              writable: true,
              value: response,
            });
            Object.defineProperty(xhr, "responseText", {
              writable: true,
              value: xhr.response,
            });
            break;
          }
        }
      }
    }
  }

  // 执行Fetch拦截器
  async function executeFetchInterceptors(input, init) {
    for (const interceptor of interceptorRegistry.fetch) {
      if (interceptor.checker(input, init)) {
        const response = await interceptor.handler(input, init);
        if (response) {
          return new Response(response.data, {
            status: response.status || 200,
            headers: response.headers || {
              "Content-Type": "application/json",
            },
          });
        }
      }
    }
    return null;
  }

  // 保存原始的 XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;

  // 创建新的 XMLHttpRequest 构造函数
  window.XMLHttpRequest = function () {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    // 重写 open 方法
    xhr.open = function () {
      this.method = arguments[0];
      this.url = arguments[1];
      return originalOpen.apply(this, arguments);
    };

    // 重写 send 方法
    xhr.send = function () {
      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          executeXHRInterceptors(xhr);
        }
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
      return originalSend.apply(this, arguments);
    };

    return xhr;
  };

  // 保存原始的 fetch
  const originalFetch = window.fetch;

  // 重写 fetch
  window.fetch = async function (input, init) {
    const interceptedResponse = await executeFetchInterceptors(input, init);
    if (interceptedResponse) {
      return interceptedResponse;
    }
    return originalFetch(input, init);
  };

  function injectScript(content, isFile = false) {
    const script = document.createElement("script");
    if (isFile) {
      script.src = content;
    } else {
      script.textContent = content;
    }
    document.head.appendChild(script);
    // 可选：在脚本加载完成后移除
    // script.onload = () => script.remove();
  }

  function injectCSS(content, isFile = false) {
    const style = document.createElement("style");
    if (isFile) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = content;
      document.head.appendChild(link);
      return;
    }
    style.textContent = content;
    document.head.appendChild(style);
  }

  injectCSS(`
.favphoto::-webkit-scrollbar { 
    /* 隐藏默认的滚动条 */
    -webkit-appearance: none;
}


.favphoto::-webkit-scrollbar:horizontal{
    /* 设置水平滚动条厚度 */
    height: 5px;
}

.favphoto::-webkit-scrollbar-thumb { 
    /* 滚动条的其他样式定制，注意，这个一定也要定制，否则就是一个透明的滚动条 */
    border-radius: 8px; 
    /* border: 2px solid rgba(255,255,255,.4);  */
    background-color: rgba(0, 0, 0, .5);
}

.favphoto {
    display: flex;
    overflow-x: auto;
    gap: 8px;
}

.favphoto img {
    width: 50px;
    object-fit: cover;
}
`);

  function parseDom(str) {
    return Document.parseHTMLUnsafe(str).body.childNodes[0];
  }
  const favListTpl = `

<%
	var infoArray = obj.items && obj.items.length > 0 ? obj.items : false;
%>
<div>
	<ul class="tabs fav-tabs col2 z-depth-1 clearfix" id="trafficTab">
        <li>
            <a class='iconfont icon-poi fav-tab fav-poi-tab <%= type == "poi" ? "current" : "" %>' href="javascript:void(0)" data-type="poi"><span>地点</span></a>
        </li>
        <li>
            <a class='icon-dir fav-tab fav-dir-tab <%= type != "poi" ? "current" : ""%>' href="javascript:void(0)" data-type="dir">路线</a>
        </li>
    </ul>

    <% if(infoArray) {%>
		<div class="favlistbox">
			<ul class="favlist mt5" >
				<%
					for(var i = 0, max = infoArray.length; i < max; i++ ) {
						var favObj = infoArray[i],
							favData = favObj.data;

						if (!favData) {
							continue;
						}
						if (favData.common_name == "null") {
							favData.common_name = "";
						}
						if (favData.custom_name == "null") {
							favData.custom_name = "";
						}
						if (favData.name == "null") {
							favData.name = "";
						}
						var name = favData.common_name ? favData.common_name : (favData.custom_name ? favData.custom_name : favData.name);

				%>
					<% if( favObj.type == "101" || favObj.type == "110") {%>
						<% if(name) {%>
							<li class="favitem" id="<%=favObj.id%>" type="<%=favObj.type%>" >
								<% if (favData.top_time_format){ %>
									<i class="fav-top"></i>
								<%}%>
								<i class="favemarker iconfont icon-poi2"></i>
								<div class="favinfo"  poiid="<%=favData.poiid%>">
									<span class="fav-tit"><h4 class="favtitle"><%=filterXss(name)%></h4></span>

									<%if((favData.custom_address && favData.custom_address != "null") || (favData.address && favData.address != "null")){%>
										<p class="favaddr"><%=favData.custom_address && favData.custom_address != "null" ? filterXss(favData.custom_address) : filterXss(favData.address)%></p>
									<%}%>
									<%if(favData.create_time_format && favData.create_time_format != '1970-01-01 00:00:00'){%>
									<p class="favtime">收藏时间：<%=favData.create_time_format%></p>
									<%}%>
									<%if(favData.item_desc){%>
									<p class="favdesc">描述：<%=favData.item_desc%></p>
									<%}%>
									<%if(favData.item_pictures_info){%>
									<p class="favphoto">
										<% favData.item_pictures_info.map(item => { %>
											<img src="<%=item.img%>" />
										<% }) %>
									</p>
									<%}%>
								</div>
								<div class="favctrl">
									<% if (favData.top_time_format){ %>
										<span class="favtopcancel">取消置顶</span>
									<%}else{%>
										<span class="favtop">置顶</span>
									<%}%>
									<span class="favedit">备注</span>
									<span class="favdel">删除</span>
								</div>
								<div class="favctrl-edit" >
									<span class="fav-edit-cancel">取消</span>
									<span class="fav-edit-save">保存</span>
								</div>
							</li>
						<%}%>

					<% }else{ %>

						<%if(favData.route_type != "0" && favData.from_poi && favData.to_poi || favData.route_name) { %>
							<li class="favitem" id="<%=favObj.id%>" type="<%=favObj.type%>">
								<i class="favemarker <%= favData.route_type == "1" ? "car" : (favData.route_type == "3" ? "walk" : "bus") %>"></i>
								<div class="favinfo">
									<%if(favData.route_type != "0" && favData.from_poi && favData.to_poi) { %>
											<h4 class="favtitle"><%=filterXss(favData.from_poi.mName)%> -> <%=filterXss(favData.to_poi.mName)%></h4>
									<%}else{%>
											<h4 class="favtitle"><%=filterXss(favData.route_name)%></h4>
									<%}%>
									<p class="favaddr"></p>
									<%if(favData.create_time_format && favData.create_time_format != '1970-01-01 00:00:00'){%>
									<p class="favtime">收藏时间：<%=favData.create_time_format%></p>
									<%}%>
								</div>
								<div class="favctrl">
									<span class="favdel">删除</span>
								</div>
							</li>
							<%}%>
					<%}%>
				<%}%>
			</ul>
			<% if(parseInt(total_page) > 1){ %>
				<div class="serp-paging">
					<b class="paging-current"><%= parseInt(pageNum) %>/<%=total_page%>页</b>
					<% if(parseInt(pageNum) < parseInt(total_page)) {%>
						<span class="paging-next" pageno="<%=parseInt(pageNum) + 1 %>"><i class="iconfont icon-chevronright"></i></span>
					<%}else{%>
						<span class="paging-prev" pageno="<%=parseInt(pageNum) - 1 %>"><i class="iconfont icon-chevronleft"></i></span>
					<%}%>
					<span class="paging-index" pageno="1">首页</span>
				</div>
			<%}%>
		</div>
	<%}else{%>

	    <h3 class="infotitle"><i class="infoico"></i>您还没有任何收藏</h3>
		<p>点击<i class="iconfont icon-star-o"></i>同步收藏到云端, 电脑、手机、平板随时都可以查看!</p>
	    <p class="infoimgbox emptyfav">
	        <img src="/assets/img/favlogin.png" alt="">
	    </p>

	<%}%>
</div>

`;

  const favInfoWindowTpl = `
    

<%
	var favData = window.findFavInfo(id) || {};
	setTimeout(() => {
		window.refreshViewjs()
	}, 1000);
%>
<div class="infowindow-wrap">
    <div class="infowindow-close"></div>
    <div class="infowindow-body poibox favitem poi-iw" id="<%=id%>" pos="<%=pos%>" name="<%=filterXss(name)%>" address="<%=address%>" tel="<%=tel%>" ttype="<%=tType%>">
        <i class="favemarker iconfont icon-poi2"></i>
        <div class="favinfo" poiid="B000A7R7RM">
            <span class="fav-tit"><h4 class="favtitle"><%=filterXss(name)%></h4></span>
            <p class="favaddr"><%=address%></p>
			<%if(favData.item_desc){%>
			<p class="favdesc">描述：<%=favData.item_desc%></p>
			<%}%>
			<%if(favData.item_pictures_info){%>
			<p class="favphoto">
				<% favData.item_pictures_info.map(item => { %>
					<img src="<%=item.img%>" />
				<% }) %>
			</p>
			<%}%>
        </div>
        <div class="poi-tool transit">
            <div class="poi-favsms">
                <i class="favit faved iconfont icon-star"></i>
                <span class="sep"></span>
                <i class="smsit"></i>   
                <span class="sep"></span>
                <i class="poi-sendcar"></i> 
            </div>

            <div class="poi-btngrp usel">
                <em class="poibtn-srharound">搜周边</em>
                <em class="poibtn-planto">设为终点</em>
                <em class="poibtn-planfrom">设为起点</em>
                <em class="poibtn-snaps">更多<i class="transit iconfont icon-caretdown"></i></em>
            </div>

            <div class="poi-srharound transit">
                <div class="srharound-shortcut">
                    <span>餐厅</span>
                    <span>宾馆</span>
                    <span>银行</span>
                    <span>公交站</span>
                </div>
                <div class="srharound-iptbox">
                    <input type="text" class="srharound-ipt">
                    <span class="srharound-srhbtn">搜索</span>
                </div>
            </div>

            <ul class="poi-snaps usel">
                <li class="poi-share">分享</li>
                <li class="poi-feedback">报错</li>
                <!-- <li class="poi-sendcar">发送到汽车</li> -->
            </ul>
            
        </div>
    </div>
    <div class="infowindow-foot"></div>
</div>
`;

  const redDotContent =
    '<div style="width: 6px; height: 6px; background-color: #f00; border-radius: 50%;user-select: none;"></div>';
  // registerFetchInterceptor(
  //     (input, init) => {
  //         const url = typeof input === 'string' ? input : input.url;
  //         return url.includes('/api/example');
  //     },
  //     async function(input, init) {
  //         return {
  //             status: 200,
  //             data: {
  //                 modified: true,
  //                 message: '这是一个被拦截的Fetch请求'
  //             }
  //         };
  //     }
  // );
  //#endregion

  //#region toast
  function toast(text, options) {
    Toastify({
      text,
      position: "center",
      ...options,
    }).showToast();
  }
  //#endregion toast

  //#region 鼠标数据
  window.cursorData = {
    lnglat: null,
    pixel: null,
    pos: null,
  };
  window.addEventListener("load", () => {
    window.themap.on("mousemove", (e) => {
      window.cursorData.lnglat = e.lnglat;
      window.cursorData.pixel = e.pixel;
      window.cursorData.pos = e.pos;
    });
  });
  //#endregion

  //#region 处理收藏图片显示
  const jsonApi = "/service/fav/getFav";
  const favListTplApi = "/assets/biz/faves/tpl/fav.list.html";
  const favInfoWindowTplApi = "/assets/tpl/canvas-favinfowindow.html";

  injectScript(
    "https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.js",
    true
  );
  injectCSS(
    "https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.css",
    true
  );

  registerXHRInterceptor(
    (xhr) => xhr.url.includes(favListTplApi),
    (xhr) => favListTpl
  );
  registerXHRInterceptor(
    (xhr) => xhr.url.includes(favInfoWindowTplApi),
    (xhr) => favInfoWindowTpl
  );

  // 查询 favInfo
  window.findFavInfo = (id) => {
    if (!window?.amap?.faves?.items)
      return {
        item_desc: null,
        item_id: null,
        id,
        item_pictures_info: null,
      };
    const data = window.amap.faves.items.find((e) => e.id === id).data;
    return {
      item_desc: data?.item_desc,
      item_id: data?.item_id,
      id,
      item_pictures_info: data?.item_pictures_info || [],
    };
  };

  // viewjs 图片查看器
  window.viewjsInstances = [];
  window.refreshViewjs = () => {
    const stopCb = (e) => (e.preventDefault(), e.stopPropagation());
    window.viewjsInstances.forEach((e) => e.destroy());
    window.viewjsInstances = Array.from(
      document.querySelectorAll(".favphoto")
    ).map((e) => {
      e.removeEventListener("click", stopCb);
      e.addEventListener("click", stopCb);
      return new window.Viewer(e, {
        zIndex: 99999,
      });
    });
  };

  // 监听图片点击
  window.addEventListener("load", () => {
    setTimeout(() => {
      window.refreshViewjs();
    }, 1000);
  });
  //#endregion

  //#region 鼠标工具-绘制覆盖物
  window.addEventListener("load", () => {
    injectScript(
      "https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.12.0/toastify.min.js",
      true
    );
    injectCSS(
      "https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.12.0/toastify.min.css",
      true
    );

    //#region UI
    const amapAppDownload = document.querySelector("#amapAppDownload");
    amapAppDownload.style.display = "none";

    const mouseToolUI = `
<a class="item" data-type="mouse-tool" href="javascript:void(0)"> <span class="icon"> <i class="iconfont icon-iconshoucangjia"></i> </span> <span class="name">工具</span>  </a>
`;
    document
      .querySelector("#layerbox_item .show-list")
      .appendChild(parseDom(mouseToolUI));

    //#region css
    injectCSS(`
.amap-copyright {
    display: none !important;
}
.input-item {
    position: relative;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    width: 100%;
    height: 3rem;
}

.input-item:last-child {
    margin-bottom: 0;
}

.input-item>select, .input-item>input[type=text], .input-item>input[type=date] {
    position: relative;
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    width: 1%;
    margin-bottom: 0;
}

.input-item>select:not(:last-child), .input-item>input[type=text]:not(:last-child), .input-item>input[type=date]:not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0
}

.input-item>select:not(:first-child), .input-item>input[type=text]:not(:first-child), .input-item>input[type=date]:not(:first-child) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0
}

.input-item-prepend {
    margin-right: -1px;
}

.input-item-text, input[type=text],input[type=date], select {
    height: calc(2.2rem + 2px);
}

.input-item-text {
    width: 6rem;
    text-align: justify;
    padding: 0.4rem 0.7rem;
    display: inline-block;
    text-justify: distribute-all-lines;
    /*ie6-8*/
    text-align-last: justify;
    /* ie9*/
    -moz-text-align-last: justify;
    /*ff*/
    -webkit-text-align-last: justify;
    /*chrome 20+*/
    -ms-flex-align: center;
    align-items: center;
    margin-bottom: 0;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    color: #495057;
    text-align: center;
    white-space: nowrap;
    background-color: #e9ecef;
    border: 1px solid #ced4da;
    border-radius: .25rem;
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
}

.input-item-text input[type=checkbox], .input-item-text input[type=radio] {
    margin-top: 0
}

.input-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    word-wrap: break-word;
    background-color: #fff;
    background-clip: border-box;
    border-radius: .25rem;
    width: 22rem;
    border-width: 0;
    border-radius: 0.4rem;
    box-shadow: 0 2px 6px 0 rgba(114, 124, 245, .5);
    position: fixed;
    bottom: 1rem;
    right: 5rem;
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: 0.55rem 0.75rem;
}

.input-text {
    line-height: 2rem;
    margin-right: 2rem;
}

.btn {
  display: inline-block;
  font-weight: 400;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border: 1px solid transparent;
  transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
  background-color: transparent;
  background-image: none;
  color: #25A5F7;
  border-color: #25A5F7;
  padding: .25rem .5rem;
  line-height: 1.5;
  border-radius: 1rem;
  -webkit-appearance: button;
  cursor:pointer;
}

.btn:hover {
  color: #fff;
  background-color: #25A5F7;
  border-color: #25A5F7
}

.btn:hover {
  text-decoration: none
}

.input-item{
  height: 2.2rem;
}
.btn{
  flex: 1;

}
.input-text{
  width: 3rem;
  margin-right: .5rem;
}
.input-card input[type=checkbox], input[type=radio] {
  box-sizing: border-box;
  padding: 0;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  padding: 0;
  margin: 0 0.5rem 0 0;
}
`);
    //#endregion css

    const mouseToolPanelUI = `
<div class="input-card" style='width: 17rem;'>
    <div class="input-item">
        <input type="radio" name='func' value='marker'><span class="input-text">画点</span>
        <input type="radio" name='func' value='polyline'><span class="input-text">画折线</span>
        <input type="radio" name='func' value='polygon'><span class="input-text" style='width:5rem;'>画多边形</span>
    </div>
    <div class="input-item">
        <input type="radio" name='func' value='rectangle'><span class="input-text">画矩形</span>
        <input type="radio" name='func' value='circle'><span class="input-text">画圆</span>
        <input type="radio" name='func' value='area'><span class="input-text">测面积</span>
    </div>
    <div class="input-item" style="gap: 10px;">
        <input id="clear" type="button" class="btn" value="清除" />
        <input id="lock" type="button" class="btn" value="锁定" />
        <input id="close" type="button" class="btn" value="关闭" />
    </div>
    <div class="input-item">
        <input type="checkbox" checked name="autosave" value="autosave"><span class="input-text">自动保存</span>
    </div>
</div>
`;
    document.body.appendChild(parseDom(mouseToolPanelUI));
    //#endregion

    const mouseToolDom = document.querySelector('[data-type="mouse-tool"]');
    const opratePanel = document.querySelector(".input-card");
    mouseToolDom.addEventListener("click", () => {
      const isShow = opratePanel.style.display !== "none";
      if (isShow) {
        opratePanel.style.display = "none";
      } else {
        opratePanel.style.display = "flex";
      }
    });

    setTimeout(() => {
      initMouseTool();
      document.querySelector('[name="autosave"]').checked &&
        initLatestAutosave();
    }, 1000);

    const initalOverlayIds = window.themap
      .getAllOverlays()
      .map((e) => e._amap_id);
    const overlays = (window.overlays = []);

    //#region 圆圈附属元素相关
    function updateCircleAttachment(
      { obj, type },
      radiusEndLngLat,
      force = false,
      originEvent = null
    ) {
      const ext = obj.getExtData() || {};
      if (!force && ext.drawing) return;
      if (!radiusEndLngLat) {
        // 如果没有 radiusEndLngLat 说明是平移
        // 按照鼠标所在位置连接圆心做射线，交于圆周与 N 点，N 点即为 radiusEndLngLat
        const curLnglat = originEvent.lnglat;
        const center = obj.getCenter();
        const raidus = obj.getRadius();
        // 计算鼠标位置与圆心的经纬度差值
        const dLng = curLnglat.getLng() - center.getLng();
        const dLat = curLnglat.getLat() - center.getLat();
        // 使用反正切函数计算角度（弧度）
        const angle = Math.atan2(dLat, dLng); // 弧度
        radiusEndLngLat = center.offset(
          Math.cos(angle) * raidus,
          Math.sin(angle) * raidus
        );
      }

      const newCenter = obj.getCenter();

      // 修正圆心点
      ext.centerMarker.setPosition(newCenter);

      // 半径线
      ext.radiusMarker.setPath([newCenter, radiusEndLngLat]);

      // 半径远端标点
      ext.radiusLineEndMarker.setPosition(radiusEndLngLat);

      // 半径长度
      ext.radiusTextMarker.setPosition(
        new AMap.LngLat(
          (ext.radiusMarker.getPath()[0].getLng() +
            ext.radiusMarker.getPath()[1].getLng()) /
            2,
          (ext.radiusMarker.getPath()[0].getLat() +
            ext.radiusMarker.getPath()[1].getLat()) /
            2
        )
      );
      ext.radiusTextMarker.setText(
        AMap.GeometryUtil.distance(...ext.radiusMarker.getPath()).toFixed(2) +
          "公里"
      );
    }
    function handleCircleDragging(event) {
      updateCircleAttachment(
        { obj: event.target, type: event.type },
        undefined,
        false,
        event
      );
    }
    //#endregion 圆圈附属元素相关

    // 添加键盘事件监听，实现撤销功能
    document.addEventListener("keydown", function (e) {
      // 检测是否按下Ctrl/Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault(); // 阻止浏览器默认的撤销行为
        if (overlays.length > 0) {
          // 移除最后一个覆盖物
          var lastOverlay = overlays.pop();
          window.themap.remove([
            lastOverlay,
            ...Object.values(lastOverlay.getExtData()),
          ]);
        }
      }
    });

    function getLockState() {
      const lockDom = document.getElementById("lock");
      const nextState = lockDom.value;
      return nextState === "锁定";
    }
    function lockOverlays() {
      const lockDom = document.getElementById("lock");
      const nextState = lockDom.value;
      const locked = nextState === "锁定";
      overlays.map((item) => {
        item.setOptions({
          draggable: locked ? false : true,
        });
      });
      lockDom.value = locked ? "解锁" : "锁定";
      return nextState;
    }

    function initMouseTool() {
      var mouseTool = new AMap.MouseTool(window.themap);
      window.mouseTool = mouseTool;

      //监听draw事件可获取画好的覆盖物
      mouseTool.on("drawing", ({ obj, type }) => {
        const ext = obj.getExtData() || {};
        obj.setExtData({ ...ext, drawing: true });

        if (obj.className === "Overlay.Circle") {
          const thisMap = obj.getMap();

          if (!ext.centerMarker) {
            // 创建圆心
            const centerMarker = new AMap.Marker({
              position: obj.getCenter(),
              content: redDotContent,
              offset: new AMap.Pixel(-3, -3),
            });

            // 创建半径
            const radiusMarker = new AMap.Polyline({
              path: [obj.getCenter(), window.cursorData.lnglat],
              strokeColor: "blue",
              strokeStyle: "dashed",
            });

            // 创建半径终点 marker
            const radiusLineEndMarker = new AMap.Marker({
              position: window.cursorData.lnglat,
              content: redDotContent,
              offset: new AMap.Pixel(-3, -3),
            });

            // 创建半径大小描述
            const radiusTextMarker = new AMap.Text({
              position: new AMap.LngLat(
                (radiusLineEndMarker.getPosition().getLng() +
                  obj.getCenter().getLng()) /
                  2,
                (radiusLineEndMarker.getPosition().getLat() +
                  obj.getCenter().getLat()) /
                  2
              ),
              text:
                AMap.GeometryUtil.distance(
                  obj.getCenter(),
                  window.cursorData.lnglat
                ).toFixed(2) + "公里",
              offset: new AMap.Pixel(-10, -10),
            });

            obj.setExtData({
              ...ext,
              centerMarker,
              radiusMarker,
              radiusLineEndMarker,
              radiusTextMarker,
            });
            thisMap.add([
              centerMarker,
              radiusMarker,
              radiusLineEndMarker,
              radiusTextMarker,
            ]);

            if (!obj.hasEvents("dragging", handleCircleDragging))
              obj.on("dragging", handleCircleDragging);
          } else {
            // 更新半径
            updateCircleAttachment(
              { obj, type },
              window.cursorData.lnglat,
              true
            );
          }
        }
      });
      mouseTool.on("draw", function ({ obj, type }) {
        obj.setExtData({ ...obj.getExtData(), drawing: false });
        overlays.push(obj);
      });

      function draw(type) {
        switch (type) {
          case "marker": {
            mouseTool.marker({
              draggable: getLockState(),
              //同Marker的Option设置
            });
            break;
          }
          case "polyline": {
            mouseTool.polyline({
              draggable: getLockState(),
              strokeColor: "#80d8ff",
              //同Polyline的Option设置
            });
            break;
          }
          case "polygon": {
            mouseTool.polygon({
              fillColor: "#00b0ff",
              draggable: getLockState(),
              strokeColor: "#80d8ff",
              bubble: true,
              //同Polygon的Option设置
            });
            break;
          }
          case "rectangle": {
            mouseTool.rectangle({
              fillColor: "#00b0ff",
              draggable: getLockState(),
              strokeColor: "#80d8ff",
              bubble: true,
              //同Polygon的Option设置
            });
            break;
          }
          case "circle": {
            mouseTool.circle({
              strokeColor: "red",
              strokeStyle: "dashed",
              fillOpacity: 0,
              draggable: getLockState(),
              bubble: true,
              //同Circle的Option设置
            });
            break;
          }
          case "area": {
            mouseTool.measureArea({
              fillColor: "#00b0ff",
              strokeColor: "#80d8ff",
              bubble: true,
              draggable: getLockState(),
              //同Circle的Option设置
            });
            break;
          }
        }
      }
      var radios = document.getElementsByName("func");
      for (var i = 0; i < radios.length; i += 1) {
        radios[i].onchange = function (e) {
          draw(e.target.value);
        };
      }
      // draw('marker')

      document.getElementById("clear").onclick = function () {
        window.themap.remove(overlays);
        overlays = [];
      };
      document.getElementById("close").onclick = function () {
        mouseTool.close(false);
        for (var i = 0; i < radios.length; i += 1) {
          radios[i].checked = false;
        }
      };
      document.getElementById("lock").onclick = function (e) {
        toast(`已经${lockOverlays()}`);
      };
    }
    function initLatestAutosave() {
      if (!localStorage.getItem(SAVE_DATA_STORAGE_KEY)) return;
      const data = JSON.parse(localStorage.getItem(SAVE_DATA_STORAGE_KEY));
      if (!Array.isArray(data)) {
        // 数据有问题
        localStorage.removeItem(SAVE_DATA_STORAGE_KEY);
        return;
      }
      if (data.length === 0) return;
      console.info(`上次数据`, data);
      const lays = data.map(unserializeObject).filter((e) => e);
      window.themap.add(lays);
      window.overlays.push(...lays);
      toast("已自动加载上次保存的标记");
      lockOverlays();
      toast("已经自动锁定所有元素");
    }

    // 自动记忆所有 overlays
    window.addEventListener("beforeunload", (e) => {
      e.preventDefault();
      e.returnValue = "";
    });

    const SAVE_DATA_STORAGE_KEY = "SAVE_DATA_STORAGE_KEY";
    window.addEventListener("beforeunload", (e) => {
      const allUserOverlays = window.themap.getAllOverlays().filter((e) => {
        return !initalOverlayIds.includes(e._amap_id);
      });
      // 所有overlays转成geojson保存
      const saveData = allUserOverlays
        .map(serializeObject)
        .filter((e) => e)
        .map((e) => JSON.parse(e));
      localStorage.setItem(SAVE_DATA_STORAGE_KEY, JSON.stringify(saveData));
    });

    //#region AMap 对象序列化
    hackAMapObjectSerialize();
    function hackAMapObjectSerialize() {
      function serializeCommon(unsavedKeys = ["extData", "map"]) {
        const opt = this.getOptions();
        const saveData = Object.fromEntries(
          Object.entries(opt).filter(([k, v]) => !unsavedKeys.includes(k))
        );
        const serializedData = {
          className: this.className,
          options: JSON.parse(JSON.stringify(saveData)),
        };
        return JSON.stringify(serializedData);
      }

      const AMap = window.AMap;
      AMap.Text.prototype.serialize = function () {
        this.setOptions({ position: this.getPosition() });
        const unsavedKeys = ["extData", "map", "content"];
        return serializeCommon.bind(this)(unsavedKeys);
      };
      AMap.Text.unserialize = function (str) {
        return new AMap.Text(JSON.parse(str).options);
      };

      AMap.Circle.prototype.serialize = function () {
        this.setOptions({ center: this.getCenter() });
        return serializeCommon.bind(this)();
      };
      AMap.Circle.unserialize = function (str) {
        return new AMap.Circle(JSON.parse(str).options);
      };

      AMap.Marker.prototype.serialize = function () {
        this.setOptions({ position: this.getPosition() });
        return serializeCommon.bind(this)();
      };
      AMap.Marker.unserialize = function (str) {
        return new AMap.Marker(JSON.parse(str).options);
      };

      AMap.Polyline.prototype.serialize = function () {};

      AMap.Polygon.prototype.serialize = function () {};

      AMap.Rectangle.prototype.serialize = function () {};
    }

    function serializeObject(obj) {
      if (!obj.serialize) return null;
      return obj.serialize();
    }
    function unserializeObject(str) {
      const data = typeof str === "string" ? JSON.parse(str) : str;
      const [type, clazz] = data.className.split(".");
      return AMap[clazz].unserialize(JSON.stringify(data));
      // switch (data.className) {
      //   case "AMap.Text":
      //     return AMap.Text.unserialize(JSON.stringify(data));
      //   case "Overlay.Circle":
      //     return AMap.Circle.unserialize(JSON.stringify(data));
      //   case "AMap.Marker":
      //     return AMap.Marker.unserialize(JSON.stringify(data));
      // }
      // return null;
    }

    //#endregion
  });

  //#endregion
})();
