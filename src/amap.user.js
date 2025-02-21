// ==UserScript==
// @name            高德地图增强插件 - 为高德地图网页版添加更多实用功能
// @namespace       https://github.com/eric-gitta-moore/amap-enhanced
// @version         2025.02.21.3
// @description     高德地图增强插件 - 为高德地图网页版添加更多实用功能
// @author          https://eric-gitta-moore.github.io/
// @match           https://www.amap.com/*
// @icon            https://a.amap.com/pc/static/favicon.ico
// @grant           GM_addStyle
// @grant           GM_getResourceText
// @run-at          document-start
// @require         https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.12.0/toastify.min.js
// @resource        toastify.min.css https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.12.0/toastify.min.css
// @require         https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.js
// @resource        viewer.min.css https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.7/viewer.min.css
// @require         https://cdnjs.cloudflare.com/ajax/libs/layer/3.5.1/layer.min.js
// @resource        layer.min.css https://cdnjs.cloudflare.com/ajax/libs/layer/3.5.1/theme/default/layer.min.css
// @require         https://unpkg.com/lucide@0.475.0/dist/umd/lucide.min.js
// @require         https://unpkg.com/watchjs@0.0.0/src/watch.min.js
// @downloadURL     https://github.com/eric-gitta-moore/amap-enhanced/raw/main/src/amap.user.js
// @updateURL       https://github.com/eric-gitta-moore/amap-enhanced/raw/main/src/amap.meta.js
// ==/UserScript==
// @docs            https://lbs.amap.com/api/javascript-api-v2/summary
// @docs            https://lbs.amap.com/api/webservice/summary
// @docs            https://a.amap.com/jsapi/static/doc/20210906/index.html
// @docs            https://www.tampermonkey.net/documentation.php

//#region globalVar
const SAVE_DATA_STORAGE_KEY = "SAVE_DATA_STORAGE_KEY";
const initalOverlayIds = [];
// 骑行导航对象
let currentRidingRoute = null;

const _internal_overlays = [];
// 每个overlay添加或删除时，会触发这个回调重新绑定右键事件，辅助右键删除功能。
// 也可以用 OverlayGroup，但是这个也得监听添加事件才行
const overlaysCallback = [];
const overlays = createArrayProxy(_internal_overlays, () => {
  overlaysCallback.forEach((callback) => {
    callback();
  });
});

const lodash = _.noConflict();
//#endregion globalVar

//#region utils
function createArrayProxy(array, onChange) {
  return new Proxy(array, {
    // 监听数组属性读取
    get(target, property, receiver) {
      // 返回数组方法的代理
      const value = Reflect.get(target, property, receiver);
      if (
        typeof value === "function" &&
        ["push", "pop", "shift", "unshift", "splice"].includes(property)
      ) {
        // 触发变更回调
        onChange();
      }
      return value;
    },

    // 监听数组属性设置
    set(target, property, value, receiver) {
      Reflect.set(target, property, value, receiver);
      // 触发变更回调
      onChange();
      return true;
    },

    // 监听删除操作
    deleteProperty(target, property) {
      delete target[property];
      // 触发变更回调
      onChange();
      return true;
    },
  });
}
function setupUtils() {
  function parseDom(str) {
    return Document.parseHTMLUnsafe(str).body.childNodes[0];
  }

  function toast(text, options) {
    Toastify({
      text,
      position: "center",
      ...options,
    }).showToast();
  }
  return {
    parseDom,
    toast,
  };
}
function setupExpose() {
  unsafeWindow.$Toastify = Toastify;
  unsafeWindow.$layer = layer;
  unsafeWindow.$Viewer = Viewer;
}
setupExpose();
const { parseDom, toast } = setupUtils();
//#endregion utils

//#region injectCSS
function setupInjectCSS() {
  addEventListener("load", () => {
    GM_addStyle(GM_getResourceText("toastify.min.css"));
    GM_addStyle(GM_getResourceText("viewer.min.css"));
    GM_addStyle(GM_getResourceText("layer.min.css"));
    GM_addStyle(
      `
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
  `
    );
    GM_addStyle(
      `
.force-none {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
.app_download_box, .amap-common-download-panel, .amap-copyright, .dir_qr {
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
.input-item.tool-btn {
    gap: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: auto;
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
  `
    );
  });
}
function injectJavaScript(text) {
  const script = document.createElement("script");
  script.textContent = text;
  (document.head || document.documentElement).appendChild(script);
}
setupInjectCSS();
//#endregion injectCSS

//#region interceptors
function setupInterceptors() {
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
  const originalXHR = unsafeWindow.XMLHttpRequest;

  // 创建新的 XMLHttpRequest 构造函数
  unsafeWindow.XMLHttpRequest = function () {
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
  const originalFetch = unsafeWindow.fetch;

  // 重写 fetch
  unsafeWindow.fetch = async function (input, init) {
    const interceptedResponse = await executeFetchInterceptors(input, init);
    if (interceptedResponse) {
      return interceptedResponse;
    }
    return originalFetch(input, init);
  };

  return {
    registerFetchInterceptor,
    registerXHRInterceptor,
  };
}
const { registerFetchInterceptor, registerXHRInterceptor } =
  setupInterceptors();
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
//#endregion interceptors

//#region template
function setupTemplate() {
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

  const contextMenuUI = `
<ul class="context_menu">
    <li class="menu_item menu_plan" type="marker-tmp-from" id="menuFrom">
        <i class="menu-icon menu-icon-from"></i><span>设为起点</span>
    </li>
    <li class="menu_item menu_plan menu_via" type="marker-tmp-via" id="menuVia">
        <i class="menu-icon menu-icon-via"></i><span>设为途经点</span>
    </li>
    <li class="menu_item menu_plan" type="marker-tmp-to" id="menuTo">
        <i class="menu-icon menu-icon-to"></i><span>设为终点</span>
    </li>
</ul>
<ul class="context_menu border-t">
    <li class="menu_item" id="menuWhere">
        <i class="iconfont icon-where"></i><span>这是哪儿</span>
    </li>
    <li class="menu_item" id="menuNear">
        <i class="iconfont icon-nearby"></i><span>搜周边</span>
    </li>
    <li class="menu_item" id="menuSetCenter">
        <i class="iconfont icon-mapcenter"></i><span>设为地图中心点</span>
    </li>
    <li class="menu_item unable" id="menuClearDir">
        <i class="iconfont icon-clearmap"></i><span>清除路线</span>
    </li>
    <li class="menu_item" id="menuClearmap">
        <i class="iconfont icon-clearmap"></i><span>清除地图</span>
    </li>
    <li class="menu_item" id="menuClearMarker">
        <i class="iconfont icon-clearmap"></i><span>清除标记物</span>
    </li>
</ul>
`;

  const redDotContent =
    '<div style="width: 6px; height: 6px; background-color: #f00; border-radius: 50%;user-select: none;"></div>';

  const mouseToolUI = `
<a class="item active" data-type="mouse-tool" href="javascript:void(0)"> <span class="icon"> <i class="iconfont icon-iconshoucangjia"></i> </span> <span class="name">工具</span>  </a>
`;
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
      <div class="input-item tool-btn">
          <input id="hide-lays" type="button" class="btn" value="隐藏" />
          <input id="clear" type="button" class="btn" value="清除" />
          <input id="lock" type="button" class="btn" value="锁定" />
          <input id="fit-view" type="button" class="btn" value="自动缩放" />
      </div>
      <div class="input-item">
          <input type="checkbox" checked name="autosave" value="autosave"><span class="input-text">自动保存</span>
      </div>
  </div>
  `;
  return {
    favListTpl,
    favInfoWindowTpl,
    redDotContent,
    mouseToolPanelUI,
    mouseToolUI,
    contextMenuUI,
  };
}
const {
  favListTpl,
  favInfoWindowTpl,
  redDotContent,
  mouseToolPanelUI,
  mouseToolUI,
  contextMenuUI,
} = setupTemplate();
//#endregion template

//#region 实时鼠标数据
function setupCursorData() {
  const cursorData = {
    lnglat: null,
    pixel: null,
    pos: null,
  };
  addEventListener("load", () => {
    themap.on("mousemove", (e) => {
      cursorData.lnglat = e.lnglat;
      cursorData.pixel = e.pixel;
      cursorData.pos = e.pos;
    });
  });
  return { cursorData };
}
const { cursorData } = setupCursorData();
//#endregion 实时鼠标数据

//#region 处理收藏图片显示模版和预览
// 我的收藏 模版替换
function setupTplInterceptors() {
  const jsonApi = "/service/fav/getFav";
  const favListTplApi = "/assets/biz/faves/tpl/fav.list.html";
  const favInfoWindowTplApi = "/assets/tpl/canvas-favinfowindow.html";
  const contextMenuTplApi = "/assets/tpl/canvas-contextMenu.html";

  registerXHRInterceptor(
    (xhr) => xhr.url.includes(favListTplApi),
    (xhr) => favListTpl
  );
  registerXHRInterceptor(
    (xhr) => xhr.url.includes(favInfoWindowTplApi),
    (xhr) => favInfoWindowTpl
  );
  registerXHRInterceptor(
    (xhr) => xhr.url.includes(contextMenuTplApi),
    (xhr) => contextMenuUI
  );

  // 查询 favInfo
  unsafeWindow.findFavInfo = (id) => {
    if (!amap?.faves?.items)
      return {
        item_desc: null,
        item_id: null,
        id,
        item_pictures_info: null,
      };
    const data = amap.faves.items.find((e) => e.id === id).data;
    return {
      item_desc: data?.item_desc,
      item_id: data?.item_id,
      id,
      item_pictures_info: data?.item_pictures_info || [],
    };
  };
}
setupTplInterceptors();

// viewjs 图片查看器
function setupViewjs() {
  // viewjs 图片查看器
  const viewjsInstances = [];
  const refreshViewjs = () => {
    const stopCb = (e) => (e.preventDefault(), e.stopPropagation());
    viewjsInstances.forEach((e) => e.destroy());
    viewjsInstances.length = 0;
    for (const e of document.querySelectorAll(".favphoto")) {
      e.removeEventListener("click", stopCb);
      e.addEventListener("click", stopCb);
      viewjsInstances.push(
        new Viewer(e, {
          zIndex: 99999,
        })
      );
    }
  };
  unsafeWindow.refreshViewjs = refreshViewjs;

  // 监听图片点击
  addEventListener("load", () => {
    setTimeout(() => {
      refreshViewjs();
    }, 1000);
  });
}
setupViewjs();
//#endregion 处理收藏图片显示模版和预览

//#region AMap 对象序列化
function setupAMapSerialize() {
  function hackAMapObjectSerialize() {
    function serializeCommon(unsavedKeys = ["extData", "map"]) {
      const opt = this.getOptions();
      const saveData = Object.fromEntries(
        Object.entries(opt).filter(([k, v]) => !unsavedKeys.includes(k))
      );
      const serializedData = {
        className: this.className,
        _amap_id: this._amap_id,
        options: JSON.parse(JSON.stringify(saveData)),
      };
      return serializedData;
    }

    AMap.Text.prototype.toJSON = function () {
      this.setOptions({ position: this.getPosition() });
      const unsavedKeys = ["extData", "map", "content"];
      return serializeCommon.bind(this)(unsavedKeys);
    };
    AMap.Text.unserialize = (str) => new AMap.Text(JSON.parse(str).options);

    AMap.Circle.prototype.toJSON = function () {
      this.setOptions({ center: this.getCenter() });
      const data = serializeCommon.bind(this)();
      data.options.extData = JSON.parse(JSON.stringify(this.getExtData()));
      return data;
    };
    AMap.Circle.unserialize = (str) => new AMap.Circle(JSON.parse(str).options);

    AMap.Marker.prototype.toJSON = function () {
      this.setOptions({ position: this.getPosition() });
      return serializeCommon.bind(this)();
    };
    AMap.Marker.unserialize = (str) => new AMap.Marker(JSON.parse(str).options);

    AMap.Polyline.prototype.toJSON = function () {
      this.setOptions({ path: this.getPath() });
      return serializeCommon.bind(this)();
    };
    AMap.Polyline.unserialize = (str) =>
      new AMap.Polyline(JSON.parse(str).options);

    AMap.Polygon.prototype.toJSON = function () {
      this.setOptions({ path: this.getPath() });
      return serializeCommon.bind(this)();
    };
    AMap.Polygon.unserialize = (str) =>
      new AMap.Polygon(JSON.parse(str).options);

    AMap.Rectangle.prototype.toJSON = function () {
      this.setOptions({ bounds: this.getBounds() });
      return serializeCommon.bind(this)();
    };
    AMap.Rectangle.unserialize = (str) => {
      const opts = JSON.parse(str).options;
      return new AMap.Rectangle({
        ...opts,
        bounds: new AMap.Bounds(
          opts.bounds.slice(0, 2),
          opts.bounds.slice(2, 4)
        ),
      });
    };
  }
  addEventListener("load", hackAMapObjectSerialize);

  function serializeObject(obj) {
    if (!obj.toJSON) return null;
    return obj.toJSON();
  }
  function unserializeObject(str) {
    const data = typeof str === "string" ? JSON.parse(str) : str;
    const [type, clazz] = data.className.split(".");
    const instance = AMap[clazz].unserialize(JSON.stringify(data));
    instance._last_amap_id = data._amap_id;
    return instance;
  }
  return {
    serializeObject,
    unserializeObject,
  };
}
const { serializeObject, unserializeObject } = setupAMapSerialize();
//#endregion AMap 对象序列化

//#region MouseTool 工具相关

//#region MouseTool UI
function setupToolUI() {
  // 删掉右上角的下载 APP 腾出位置
  const amapAppDownload = document.querySelector("#amapAppDownload");
  amapAppDownload.style.display = "none";

  // 添加右上角工具按钮，添加右下角控制面板
  document
    .querySelector("#layerbox_item .show-list")
    .appendChild(parseDom(mouseToolUI));
  document.body.appendChild(parseDom(mouseToolPanelUI));

  const mouseToolDom = document.querySelector('[data-type="mouse-tool"]');
  const opratePanel = document.querySelector(".input-card");
  mouseToolDom.addEventListener("click", () => {
    const isShow = opratePanel.style.display !== "none";
    if (isShow) {
      opratePanel.style.display = "none";
      mouseToolDom.classList.remove("active");
    } else {
      opratePanel.style.display = "flex";
      mouseToolDom.classList.add("active");
    }
  });
}
addEventListener("load", setupToolUI);
//#endregion MouseTool UI

//#region utils
function setupMouseToolUtils() {
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
  return {
    getLockState,
    lockOverlays,
  };
}
const { getLockState, lockOverlays } = setupMouseToolUtils();
//#endregion utils

//#region 工具面板

//#region 工具控制面板事件
function setupMouseToolEvents() {
  function closeMouseTool() {
    themap._mouseTool.close(false);
    var radios = document.getElementsByName("func");
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].checked = false;
    }
  }

  function draw(type) {
    switch (type) {
      case "marker": {
        themap._mouseTool.marker({
          draggable: getLockState(),
          //同Marker的Option设置
        });
        break;
      }
      case "polyline": {
        themap._mouseTool.polyline({
          draggable: getLockState(),
          isOutline: true,
          //同Polyline的Option设置
        });
        break;
      }
      case "polygon": {
        themap._mouseTool.polygon({
          draggable: getLockState(),
          bubble: true,
          //同Polygon的Option设置
        });
        break;
      }
      case "rectangle": {
        themap._mouseTool.rectangle({
          draggable: getLockState(),
          bubble: true,
          //同Polygon的Option设置
        });
        break;
      }
      case "circle": {
        themap._mouseTool.circle({
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
        themap._mouseTool.measureArea({
          bubble: true,
          draggable: getLockState(),
          //同Circle的Option设置
        });
        break;
      }
    }
  }

  function setupEvents() {
    document.getElementById("clear").onclick = function () {
      themap.remove(overlays);
      overlays.splice(0, overlays.length);
      toast("清除成功");
    };
    document.getElementById("lock").onclick = function (e) {
      toast(`已经${lockOverlays()}`);
    };
    document.getElementById("hide-lays").onclick = function (e) {
      const nextState = e.target.value;
      const hide = nextState === "隐藏";
      if (hide) overlays.map((e) => e.hide());
      else overlays.map((e) => e.show());
      e.target.value = hide ? "显示" : "隐藏";
      toast(`已经${nextState}`);
    };
    document.getElementById("fit-view").onclick = function () {
      themap.setFitView(overlays);
      toast(`已经缩放到合适大小`);
    };

    const radios = document.getElementsByName("func");
    for (let i = 0; i < radios.length; i += 1) {
      radios[i].onchange = function (e) {
        draw(e.target.value);
      };
    }
  }

  addEventListener("load", setupEvents);
  return { closeMouseTool };
}
const { closeMouseTool } = setupMouseToolEvents();
//#endregion 工具控制面板事件

//#region MouseTool 初始化
function initMouseTool() {
  themap._mouseTool = new AMap.MouseTool(themap);

  //监听draw事件可获取画好的覆盖物
  themap._mouseTool.on("drawing", ({ obj, type }) => {
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
          path: [obj.getCenter(), cursorData.lnglat],
          strokeColor: "blue",
          strokeStyle: "dashed",
        });

        // 创建半径终点 marker
        const radiusLineEndMarker = new AMap.Marker({
          position: cursorData.lnglat,
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
              cursorData.lnglat
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
        overlays.push(
          centerMarker,
          radiusMarker,
          radiusLineEndMarker,
          radiusTextMarker
        );

        if (!obj.hasEvents("dragging", handleCircleDragging))
          obj.on("dragging", handleCircleDragging);
      } else {
        // 更新半径
        updateCircleAttachment({ obj, type }, cursorData.lnglat, true);
      }
    }
  });
  themap._mouseTool.on("draw", function ({ obj, type }) {
    obj.setExtData({ ...obj.getExtData(), drawing: false });
    overlays.push(obj);
    closeMouseTool();
  });
}
addEventListener("load", initMouseTool);
//#endregion MouseTool 初始化

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
    Number(
      AMap.GeometryUtil.distance(...ext.radiusMarker.getPath()) / 1000
    ).toFixed(2) + "公里"
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

//#endregion 工具面板

//#region 撤销功能
// 添加键盘事件监听，实现撤销功能
document.addEventListener("keydown", function (e) {
  // 检测是否按下Ctrl/Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault(); // 阻止浏览器默认的撤销行为
    if (overlays.length > 0) {
      // 移除最后一个覆盖物
      var lastOverlay = overlays.pop();
      themap.remove([lastOverlay, ...Object.values(lastOverlay.getExtData())]);
    }
  }
});
//#endregion 撤销功能

//#region 自动保存 自动加载
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
  themap.add(lays);
  overlays.push(...lays);

  //#region 处理 circle 附属元素
  const mapper = Object.fromEntries(
    overlays
      .filter((e) => e._last_amap_id)
      .map((lay) => [lay._last_amap_id, lay])
  );
  lays
    .filter((lay) => lay.className === "Overlay.Circle")
    .map((item) => {
      const opts = item.getOptions();
      for (const key in opts.extData) {
        if (Object.prototype.hasOwnProperty.call(opts.extData, key)) {
          // 复原绑定关系，半径、中心点、圆周点、半径长度
          const element = opts.extData[key];
          if (element instanceof Object && "_amap_id" in element) {
            const last_amap_id = element._amap_id;
            const lay = mapper[last_amap_id];
            opts.extData[key] = lay;
          }
        }
      }
      return item;
    })
    .map((obj) => {
      // 绑定 circle 附属元素事件
      if (!obj.hasEvents("dragging", handleCircleDragging))
        obj.on("dragging", handleCircleDragging);
    });

  //#endregion 处理 circle 附属元素

  toast(`已自动加载上次保存的标记，共 ${overlays.length} 个`);
  lockOverlays();
  toast("已经自动锁定所有元素");
}
addEventListener("load", () => {
  // 记录原本高德地图自带的 marker
  initalOverlayIds.push(...themap.getAllOverlays().map((e) => e._amap_id));
  setTimeout(() => {
    document.querySelector('[name="autosave"]').checked && initLatestAutosave();
  }, 1000);
});

// 自动记忆所有 overlays
function saveAllOverlays() {
  // const allUserOverlays = themap.getAllOverlays().filter((e) => {
  //   return !initalOverlayIds.includes(e._amap_id);
  // });
  const allUserOverlays = overlays;
  if (!document.querySelector('[name="autosave"]').checked) return;
  // 所有overlays转成json保存
  const saveData = allUserOverlays.map(serializeObject).filter((e) => e);
  localStorage.setItem(SAVE_DATA_STORAGE_KEY, JSON.stringify(saveData));
}
addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "";
  saveAllOverlays();
});
//#endregion 自动保存 自动加载

//#endregion MouseTool 工具相关

//#region 右键菜单增强 - 删除元素
function setupContextMenuEnhance() {
  let lastClickOverlayEvent = null;
  const rightclickCallback = (e) => (lastClickOverlayEvent = e);
  function reapplyRightclickEvent() {
    console.log("reapplyRightclickEvent");
    overlays.map((lay) => {
      if (!lay.hasEvents("rightclick", rightclickCallback))
        lay.on("rightclick", rightclickCallback);
    });
  }
  overlaysCallback.push(reapplyRightclickEvent);

  function patchRightclickEvent() {
    function checkPropagationScope(event, selector) {
      const e = event;
      let cursor = e.target;
      while (cursor !== e.currentTarget) {
        if (cursor === document.querySelector(selector)) return true;
        cursor = cursor.parentNode;
      }
      return false;
    }
    document.getElementById("themap").addEventListener(
      "click",
      (e) => {
        if (!checkPropagationScope(e, "#menuClearMarker")) return;
        const menuDom = document.querySelector(".amap-menu");
        const menuRect = menuDom.getBoundingClientRect();
        const menuPixel = new AMap.Pixel(menuRect.x, menuRect.y);

        // 误差，四舍五入
        if (!menuPixel.round().equals(lastClickOverlayEvent.pixel.round()))
          return;

        const curLay = lastClickOverlayEvent.target;
        curLay.remove();
        toast(`删除 ${curLay.className} 成功`);
        const idx = overlays.findIndex((e) => e === curLay);
        if (idx === -1) return;
        overlays.splice(idx, 1);
      },
      { capture: true }
    );
  }
  return {
    reapplyRightclickEvent,
    patchRightclickEvent,
  };
}
const { patchRightclickEvent } = setupContextMenuEnhance();
addEventListener("load", () => {
  patchRightclickEvent();
});
//#endregion 右键菜单增强 - 删除元素

//#region 元素删除逻辑补充
function patchElementRemoveLogic() {
  const originRemove = AMap.Circle.prototype.remove;
  AMap.Circle.prototype.remove = function () {
    const ext = this.getExtData();
    if (!ext || typeof ext !== "object") return originRemove();
    Object.entries(ext).map(([key, value]) => {
      value.remove?.();
    });
    return originRemove.call(this);
  };
}
addEventListener("load", () => {
  patchElementRemoveLogic();
});
//#endregion 元素删除逻辑补充

//#region 补充骑行导航规划
function patchSDKPlugins() {
  const sdkApi = `webapi.amap.com/maps`;
  const additionPlugins = ["AMap.Riding"];
  let patched = false;

  function pathSDKUrl(originSrc) {
    const originURI = new URL(originSrc);
    const originPlugins = (originURI.searchParams.get("plugin") || "")
      .split(",")
      .filter((e) => e);

    const hackedPlugins = Array.from(
      new Set(originPlugins.concat(additionPlugins))
    );
    originURI.searchParams.set("plugin", hackedPlugins.join(","));
    return originURI.toString();
  }

  // tampermonkey UserScript 监听所有 document 操作，并且替换掉其中的 script src 或者阻止所有 script 加载
  // 参考方案: https://stackoverflow.com/a/76592599/16834604
  function hackDocumentLoad() {
    new MutationObserver((mutations, observer) => {
      let oldScript = mutations
        .flatMap((e) => [...e.addedNodes])
        .filter((e) => e.tagName == "SCRIPT")
        .find((e) => e.src.includes(sdkApi));

      if (oldScript) {
        patched = true;
        observer.disconnect();
        // oldScript.remove();
        oldScript.src = pathSDKUrl(oldScript.src);
      }
    }).observe(document, {
      childList: true,
      subtree: true,
    });
  }
  hackDocumentLoad();

  addEventListener("load", () => {
    if (!patched) {
      toast("高德地图 SDK 拦截失败，步行导航功能将无法注入");
      return;
    }
    toast("高德地图 SDK 拦截成功，注入增强插件");
  });
}
function setupRidingRouteUI() {
  GM_addStyle(`
#planForm .dir_tab {
  display: flex;
  gap: 30px;
}
#ridingTab {
  background: transparent;
  display: flex;
  align-items: center;
  margin: auto;
}
.riding-plan .plan dt.start {
  line-height: 25px;
}
.riding-plan .plan dt.end {
  line-height: 25px;
}
.riding-plan .plan-nobus dt {
  height: 25px;
}
.line-search-clear {
  display: inline !important;
}
`);
  const ridingUI = `
<li> <a id="ridingTab" class="palntype_tab icondirtip" href="javascript:void(0)" data-type="riding"><i data-lucide="bike"></i></a> </li>
`;

  addEventListener("DOMContentLoaded", () => {
    function injectUI() {
      if (document.querySelector("#ridingTab")) return;
      const panel = document.querySelector("#planForm");
      const tabs = panel.querySelector("#trafficTab");
      const ridingEl = parseDom(ridingUI);
      tabs.appendChild(ridingEl);

      let layerTipIdx = null;
      ridingEl.addEventListener("mouseenter", () => {
        if (layerTipIdx) return;
        layerTipIdx = layer.tips("骑行", ridingEl, { tips: 3 });
      });
      ridingEl.addEventListener("mouseleave", () => {
        layerTipIdx && layer.close(layerTipIdx);
        layerTipIdx = null;
      });
      refreshLucideIcons();
      return !!tabs;
    }
    const dirbox = document.querySelector("#dirbox");
    // 执行时机不能错，否则 MutationObserver 监听不到
    new MutationObserver((mutations, observer) => {
      setTimeout(() => {
        if (injectUI()) {
          observer.disconnect();
        }
      }, 0);
    }).observe(dirbox, {
      childList: true,
      subtree: true,
    });
  });

  addEventListener("load", () => {
    const isRiding = jQuery("#ridingTab").hasClass("current");
    isRiding && jQuery("#planList").addClass("riding-plan");

    jQuery("#planForm .dir_tab").on("click", function () {
      jQuery("#planList").removeClass("riding-plan");
    });
    jQuery(dirbox).on("click", "#ridingTab", function () {
      jQuery(".dir_submit").text("骑车去");
      // 修复路线规划面板的 css 需要
      jQuery("#planList").addClass("riding-plan");
    });
  });
}
/**
 * FN setupRidingRouteEnhance
 *
 * ##逆向信息:
 *
 * 高德地图具体实现是 jq 在 document 绑定了事件。直接全局搜 `"amap.dirp"` 可以定位到
 *
 * > 以下的代码中 `jQuery` 都是替换过的，可能要在原代码找到位置，然后在替换成实际的才能出来数据
 *
 * 这个是监听，一共有三个（可以通过 `jQuery._data(document).events` 获取所有绑定的 jq 自定义事件），这个是主要的
 * ```js
 * // 文件名 dir.07dde228b67a226e7249.js
 * jQuery(document).on("amap.dirp", function(i, t) {
 *    e.showDirlist(amap.dirp)
 * })
 * ```
 *
 * 最后具体显示在这里。具体的前端显示会有个模版，他们在后台可以配置，所以这里需要动态获取。
 *
 * > 然后在找请求链的时候，需要跳过 baxia.js，这个是阿里内部的 API 鉴权限流工具，叫做 霸下
 *
 * 这里是驾车的
 * ```js
 * var m = {
 *     car: "dir-plan-car",
 *     bus: "dir-plan-bus",
 *     walk: "dir-plan-walk",
 *     train: "dir-plan-train"
 * }
 *   , w = m[d]
 *   , v = e(14);
 * v.tplLoad({
 *     filename: w,
 *     data: h,
 *     path: "/assets/biz/dir/tpl/",
 *     callback: function(i) {
 *         if (a.initDirlist(i, c),                                           // 初始化模版
 *         "bus" == d && a.setTimePick(),
 *         "bus" === d && h.railtype && "railway" === h.railtype && (d = "train"),
 *         "train" === d && void 0 !== h.curopen) {
 *             var t = parseInt(h.curopen);
 *             a.showPlan(t)                                                  // 这里是显示具体方案
 *         }
 * ```
 *
 * 这里是步行的，比较完整
 *
 * ```js
 * dirWalk: function(t) {
 *    ...
 *    AMap.plugin(["AMap.Walking"], function() {
 *        r && (s = new AMap.LngLat(r.split(",")[0],r.split(",")[1])),
 *        l && (p = new AMap.LngLat(l.split(",")[0],l.split(",")[1]));
 *        var t = new AMap.Walking;
 *        amap.walking = t,
 *        t.search(s, p),
 *        AMap.event.addListener(t, "complete", function(t) {
 *            var i = a.buildWalkData(t);
 *            n.id = n.id && n.id.split("-")[0] + "-from" || "from",
 *            o.id = o.id && o.id.split("-")[0] + "-to" || "to",
 *            i.frominfo = n,
 *            i.toinfo = o,
 *            amap.dirp = i,
 *            e(document).trigger("amap.dirp", i)                // 服务端规划完成，渲染到前端
 *        }),
 *        AMap.event.addListener(t, "error", function(t) {
 *            t.frominfo = n,
 *            t.toinfo = o,
 *            t.type = "walk",
 *            t.nodirp = "true",
 *            "20803" == t.infocode ? t.routes = [{
 *                distanceNum: 100001
 *            }] : t.routes = [],
 *            amap.dirp = t,
 *            e(document).trigger("amap.dirp", amap.dirp)
 *        })
 *    })
 * ```
 *
 *
 * 》》》》》》》》》》》》算了玛德，很多要插入到他们的 js 里面 hack 才行，还不如直接自己搞一个《《《《《《《《《《《《
 */
function setupRidingRouteEnhance() {
  // 全局变量
  currentRidingRoute = null;
  /**
   * 算了还是不同步官方模版了，还要处理 mouseover 时候高亮路段，估计没法搞
   * 要重新绑定里面的事件 `me.listener.routeStepItem`，不然无法触发 `me._highlightOverlay`
   * @param {*} data
   */
  // const renderRidingTpl = (data) => {
  //   const amapRenderTpl = _.template;
  // };
  const execRoute = () => {
    const isRiding = jQuery("#ridingTab").hasClass("current");
    if (!isRiding) return;
    if (currentRidingRoute) {
      currentRidingRoute.clear();
      currentRidingRoute = null;
    }
    const dirnew = amap.directionnew;
    /*
      模版绘制函数在这个插件的代码里面，和系统自带的请求 dir-plan-walk.html 模版不一样。html 模版可以用 `_.template(data)` 来渲染
        me.view.createOpenitemDiv = function(index, title, data, isDisplay) {
            var rides = data.routes[index].rides
              , r = [];
            r.push('<dl class="plan plan-nobus">'),
            r.push("    <dt class=\"start\"><div class='beforedt'></div><div class='afterdt'></div><b>" + data.start.name + "</b></dt>");
            for (var step, i = 0; i < rides.length; i++)
                step = rides[i],
                r.push(' <dt class="route turn-' + me.getSigns(step.action) + '"  index="' + index + '">                '),
                r.push("  <div class='beforedt'></div><div class='afterdt'></div>       " + step.instruction),
                r.push(" </dt>");
            return r.push("    <dt class=\"end\"><div class='beforedt'></div><b>" + data.end.name + "</b></dt>"),
            r.push("</dl>"),
            r
        }
    */
    themap.plugin(["AMap.Riding"], function () {
      //加载步行导航插件
      currentRidingRoute = new AMap.Riding({
        map: themap,
        panel: jQuery("#planList").get(0),
      }); //构造步行导航类
      AMap.Event.addListener(currentRidingRoute, "complete", function () {
        toast("骑行导航规划成功");
        jQuery(".line-search-submit").removeClass("butLoading");
        jQuery(".line-search-clear").removeClass("none");
        jQuery("#planList").css("display", "block");

        // // 记得删了系统右键加的那对起点终点
        // jQuery(".amap-lib-marker-to").parent().addClass("force-none");
        // jQuery(".amap-lib-marker-from").parent().addClass("force-none");
        // 删掉临时点 marker-tmp-*
        jQuery(".marker-tmp-from").hide();
        jQuery(".marker-tmp-to").hide();
      }); //返回导航查询结果
      //根据起、终点坐标规划步行路线
      currentRidingRoute.search(
        new AMap.LngLat(...dirnew.from.lnglat.split(",")),
        new AMap.LngLat(...dirnew.to.lnglat.split(","))
      );
    });
  };
  const clearRoute = () => {
    if (currentRidingRoute) {
      currentRidingRoute.clear();
    }
  };
  execRoute();
  watch(amap, "directionnew", execRoute);
  // 不能直接选进去，load 时刻没有里面的元素，最深只能到 #dirbox。所以只能委托处理
  jQuery("#dirbox").on(
    "click",
    'ul.dir_tab a:not([data-type="car"])',
    clearRoute
  );
  jQuery("#dirbox").on("click", ".line-search-clear", clearRoute);
}
patchSDKPlugins();
addEventListener("load", setupRidingRouteEnhance);
setupRidingRouteUI();
//#endregion 补充骑行导航规划

//#region 导入 lucide 图标
function refreshLucideIcons() {
  unsafeWindow.lucide = lucide;
  lucide.createIcons();
}
addEventListener("load", () => {
  refreshLucideIcons();
  setTimeout(() => {
    refreshLucideIcons();
  }, 1000);
});
//#endregion 导入 lucide 图标
