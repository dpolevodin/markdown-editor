import {log} from '@diplodoc/transform/lib/log.js';

import type {ExtensionAuto} from '../../../../core';

import {VideoAttr, videoNodeName} from './const';
import {
    type VideoPluginOptions,
    VideoService,
    type VideoToken,
    defaults,
    videoPlugin,
} from './md-video';
import {createViewStub, serializeNodeToString} from './utils';

// we don't support osf service
const availableServices: ReadonlySet<string> = new Set([
    VideoService.YouTube,
    VideoService.Vimeo,
    VideoService.Vine,
    VideoService.Prezi,
]);

export {videoNodeName} from './const';
export {videoType} from './utils';

export type VideoSpecsOptions = VideoPluginOptions & {};

export const VideoSpecs: ExtensionAuto<VideoSpecsOptions> = (builder, opts) => {
    const options = {...defaults, ...opts, log};

    builder.configureMd((md) => md.use(videoPlugin, options));
    builder.addNode(videoNodeName, () => ({
        spec: {
            inline: true,
            atom: true,
            group: 'inline',
            attrs: {[VideoAttr.Service]: {}, [VideoAttr.VideoID]: {}},
            parseDOM: [
                {
                    tag: `span[${VideoAttr.Service}][${VideoAttr.VideoID}]`,
                    getAttrs(dom) {
                        const domElem = dom as HTMLElement;
                        return {
                            [VideoAttr.Service]: domElem.getAttribute(VideoAttr.Service),
                            [VideoAttr.VideoID]: domElem.getAttribute(VideoAttr.VideoID),
                        };
                    },
                },
                {
                    tag: `iframe[${VideoAttr.Service}][${VideoAttr.VideoID}]`,
                    getAttrs(dom) {
                        const domElem = dom as HTMLElement;
                        return {
                            [VideoAttr.Service]: domElem.getAttribute(VideoAttr.Service),
                            [VideoAttr.VideoID]: domElem.getAttribute(VideoAttr.VideoID),
                        };
                    },
                    priority: 100,
                },
            ],
            toDOM(node) {
                const service = node.attrs[VideoAttr.Service];
                const videoId = node.attrs[VideoAttr.VideoID];

                if (availableServices.has(service) || !videoId) {
                    let src = '';
                    if (typeof options.videoUrl === 'function') {
                        src = options.videoUrl(service, videoId, options);
                    }
                    return [
                        'div',
                        {
                            class: 'embed-responsive embed-responsive-16by9',
                        },
                        [
                            'iframe',
                            {
                                class: `embed-responsive-item ${service}-player`,
                                type: 'text/html',
                                width: String(options[service as VideoService].width),
                                height: String(options[service as VideoService].height),
                                src: src,
                                frameborder: '0',
                                webkitallowfullscreen: '',
                                mozallowfullscreen: '',
                                allowfullscreen: '',
                                [VideoAttr.Service]: service,
                                [VideoAttr.VideoID]: videoId,
                            },
                        ],
                    ];
                }

                return createViewStub(node);
            },
        },
        fromMd: {
            tokenSpec: {
                name: videoNodeName,
                type: 'node',
                getAttrs: (tok) => ({
                    [VideoAttr.Service]: (tok as VideoToken).service,
                    [VideoAttr.VideoID]: (tok as VideoToken).videoID,
                }),
            },
        },
        toMd: (state, node) => {
            state.write(serializeNodeToString(node));
        },
    }));
};
