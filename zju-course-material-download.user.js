// ==UserScript==
// @name         ZJU Course Material Download
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  获取学在浙大中无下载权限的课件内容
// @author       eWloYW8
// @match        https://courses.zju.edu.cn/course/*/learning-activity/full-screen*
// @run-at document-idle
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 工具函数：等待元素加载
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsed = 0;
            const timer = setInterval(() => {
                const el = document.querySelectorAll(selector);
                if (el.length > 0) {
                    clearInterval(timer);
                    resolve(el);
                } else {
                    elapsed += interval;
                    if (elapsed >= timeout) {
                        clearInterval(timer);
                        reject(new Error("等待元素超时: " + selector));
                    }
                }
            }, interval);
        });
    }

    // 主逻辑封装成函数
    async function injectDownloadButtons() {
        console.log('[ZJU Course Material Download] 正在执行注入逻辑...');

        let attachments;
        try {
            attachments = await waitForElement('.attachment-row.preview-able.clearfix.ng-scope');
        } catch (e) {
            console.error(e);
            return;
        }

        const hash = window.location.hash;
        if (!hash.startsWith('#/')) {
            console.warn('[ZJU Course Material Download] 不符合预期的 sectionid 格式');
            return;
        }

        const sectionId = hash.slice(2);
        const apiUrl = `https://courses.zju.edu.cn/api/activities/${sectionId}?sub_course_id=0`;

        console.log('[ZJU Course Material Download] 请求 API:', apiUrl);

        fetch(apiUrl, { credentials: 'include' })
            .then(response => {
                if (!response.ok) throw new Error(`[ZJU Course Material Download] 请求失败：${response.status}`);
                return response.json();
            })
            .then(data => {
                const material_data = data["uploads"];
                attachments.forEach((attachment, index) => {
                    const operations_area = attachment.querySelector('.single-item');
                    if (!operations_area) return;

                    // 显式设置其高度
                    operations_area.style.minHeight = '18px';
                    operations_area.style.display = 'block';

                    const existing = operations_area.querySelector('[tipsy-literal="下载"]');
                    if (existing) {
                        console.log('[ZJU Course Material Download] 已有下载按钮，跳过');
                        return;
                    }

                    const id = material_data[index]?.id;
                    if (!id) return;

                    const a = document.createElement('a');
                    a.href = `/api/uploads/${id}/blob`;
                    a.target = '_blank';
                    a.className = '';
                    a.setAttribute('tipsy-literal', '下载');
                    a.innerHTML = `
                        <i class="font font-table-edit-download"></i>
                        <span style="color: #F20000; padding: 2px 4px;">下载</span>
                    `;
                    a.style.marginRight = '6px';
                    a.style.cursor = 'pointer';

                    // 阻止点击冒泡
                    a.addEventListener('click', (event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        window.open(a.href, '_blank');
                    });

                    operations_area.insertBefore(a, operations_area.firstChild);
                    console.log('[ZJU Course Material Download] 已插入下载按钮:', a.outerHTML);
                });
            })
            .catch(error => {
                console.error('[ZJU Course Material Download] 获取失败：', error);
            });
    }

    // 初始化 + hash变化监听
    window.addEventListener('load', () => {
        injectDownloadButtons();
    });

    window.addEventListener('hashchange', () => {
        console.log('[ZJU Course Material Download] 监听到 hash 变化，重新执行逻辑');
        injectDownloadButtons();
    });
})();
