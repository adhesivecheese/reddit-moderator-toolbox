import $ from 'jquery';

import * as TBApi from '../tbapi.ts';
import * as TBCore from '../tbcore.js';
import {escapeHTML} from '../tbhelpers.js';
import TBListener from '../tblistener.js';
import {Module} from '../tbmodule.js';
import * as TBStorage from '../tbstorage.js';
import * as TBui from '../tbui.js';

export default new Module({
    name: 'Developer Tools',
    id: 'DevTools',
    enabledByDefault: true,
    debug: true,
    settings: [
        {
            id: 'apiHelper',
            description: 'Show api button next for each element received from front-end api',
            type: 'boolean',
            default: false,
            advanced: true,
        },
        {
            id: 'commentUItester',
            description: 'Add a button to the context menu that opens an overlay to test a variety of UI things.',
            type: 'boolean',
            default: false,
            advanced: true,
        },
    ],
}, ({apiHelper, commentUItester}) => {
    const $body = $('body');

    // Function that handles
    function modifyDiv (e) {
        const $target = $(e.target);
        $target.append(`
            <span class="tb-bracket-button tb-show-api-info">
                api info
            </span>
            `);
        $target.on('click', '.tb-show-api-info', event => {
            const $pasteContent = $(
                `<pre class="tb-api-info"><code>${
                    escapeHTML(JSON.stringify($target.data('tb-details'), null, '\t'))
                }</code></pre>`,
            );
            // Prepare for the popup.
            let leftPosition;
            if (document.documentElement.clientWidth - event.pageX < 400) {
                leftPosition = event.pageX - 600;
            } else {
                leftPosition = event.pageX - 50;
            }

            // Build the context popup and once that is done append it to the body.
            TBui.popup({
                title: 'front-end api info',
                tabs: [
                    {
                        title: 'Context tab',
                        tooltip: 'Tab with context for comment.',
                        content: $pasteContent.show(),
                        footer: '',
                    },
                ],
                cssClass: 'context-button-popup',
                draggable: true,
            }).appendTo($('body'))
                .css({
                    left: leftPosition,
                    top: event.pageY - 10,
                    display: 'block',
                });
        });
    }

    if (apiHelper) {
        TBListener.debugFunc = modifyDiv;
    }

    if (commentUItester) {
        TBui.contextTrigger('tb-testCommentUI-link', {
            addTrigger: true,
            triggerText: 'Show ze overlay!',
            triggerIcon: TBui.icons.overlay,
        });
    }

    $body.on('click', '#tb-testCommentUI-link', () => {
        TBui.overlay({
            title: 'Comment UI tester',
            tabs: [
                {
                    title: 'UI tester',
                    tooltip: 'UItester.',
                    content: `
                            <div id="tb-comment-sitetable"></div>
                            <div id="tb-testCommentUI-input tb-input">
                                <input type="text" placeholder="gimme that json url" id="tb-testCommentUI-input-url" class="tb-input">
                                <button class="tb-action-button tb-testCommentUI-button fetch-single">fetch single</button>
                                <button class="tb-action-button tb-testCommentUI-button fetch-thread">fetch thread</button>
                                <button class="tb-action-button tb-testSubmissionUI-button fetch-listing">fetch submission listing</button>
                            </div>
                            <div id="notification">
                                <h1> Notification tester </h1>
                                <code>
                                    TBCore.notification = function (title, body, path, markreadid = false)
                                </code>
                                <hr>
                                <input type="text" placeholder="title" id="tb-test-notification-title" class="tb-input"><br>
                                <input type="text" placeholder="body" id="tb-test-notification-body" class="tb-input"><br>
                                <input type="text" placeholder="path" id="tb-test-notification-path" class="tb-input"><br>
                                <input type="text" placeholder="markreadid" id="tb-test-notification-markreadid" class="tb-input"><br>
                                <button class="tb-action-button tb-test-notification-button">notification</button>
                            </div>
                        `,
                    footer: '',
                },
            ],
        })
            .addClass('tb-comment-ui-test')
            .appendTo('body');

        $body.css('overflow', 'hidden');
        $body.on('click', '.tb-comment-ui-test .close', () => {
            $('.tb-comment-ui-test').remove();
            $body.css('overflow', 'auto');
        });

        $body.on('click', '.tb-test-notification-button', () => {
            const title = $body.find('#tb-test-notification-title').val();
            const body = $body.find('#tb-test-notification-body').val();
            const path = $body.find('#tb-test-notification-path').val();
            const markreadid = $body.find('#tb-test-notification-markreadid').val() || false;

            TBCore.notification(title, body, path, markreadid);
        });

        $body.on('click', '.tb-testCommentUI-button', async function () {
            const $this = $(this);
            const $siteTable = $body.find('#tb-comment-sitetable');
            $siteTable.empty();
            // Input must be the json permalink to a comment. As this is a dev tool it doesn't try to figure it out.
            const inputURL = $body.find('#tb-testCommentUI-input-url').val();
            const data = await TBApi.getJSON(inputURL, {raw_json: 1});
            TBStorage.purifyObject(data);
            const commentOptions = {
                parentLink: true,
                contextLink: true,
                fullCommentsLink: true,
            };

            if ($this.hasClass('fetch-thread')) {
                const $comments = TBui.makeCommentThread(data[1].data.children, commentOptions);
                $siteTable.append($comments);
                TBui.tbRedditEvent($comments);
            } else {
                const $comment = TBui.makeSingleComment(data[1].data.children[0], commentOptions);
                $siteTable.append($comment);
                TBui.tbRedditEvent($comment);
            }
        });

        $body.on('click', '.tb-testSubmissionUI-button', async () => {
            const $siteTable = $body.find('#tb-comment-sitetable');
            $siteTable.empty();
            const inputURL = $body.find('#tb-testCommentUI-input-url').val();
            const data = await TBApi.getJSON(inputURL, {raw_json: 1});
            TBStorage.purifyObject(data);
            TBCore.forEachChunkedDynamic(data.data.children, entry => {
                if (entry.kind === 't3') {
                    const $submission = TBui.makeSubmissionEntry(entry);
                    $siteTable.append($submission);
                }
            }).then(() => {
                setTimeout(() => {
                    TBui.tbRedditEvent($siteTable);
                    TBui.longLoadSpinner(false);
                }, 1000);
            });
        });
    });
});
