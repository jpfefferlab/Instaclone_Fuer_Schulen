import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import ForceGraph2D from "react-force-graph-2d"
import React, {useEffect, useRef, useState} from "react";
import {createSelector} from "@reduxjs/toolkit";
import { getImageSource } from '../../utils/imageUtils';

const SocialGraph = (sidebarRef) => {

    const {t} = useTranslation();

    // User config
    const [showAds, setShowAds] = useState(false);
    const [showLikes, setShowLikes] = useState(true);
    const [showComments, setShowComments] = useState(false);

    const [initialCenter, setInitialCenter] = useState(true);
    const forceRef = useRef();

    const {user} = useSelector((state) => state.user);

    const {posts} = useSelector((state) => state.newsfeed); // also contains advertisements

    const selectNewsfeed = (posts) => posts // also contains advertisements

    const selectNonAdPosts = createSelector([selectNewsfeed], newsfeed => {
        if (!showAds) {
            return newsfeed.filter(post => post.type !== 'ADVERTISEMENT')
        }

        return newsfeed;
    });

    const selectPostNodes = createSelector([selectNonAdPosts], newsfeed => newsfeed.map(post => {
        return {
            id: "p" + post.id,
            name: "Post ID: " + post.id,
            attr: [],
            color: "red",
            type: 'post',
            image: post.content,
            edgeRankScore: post.edge_rank_score,
            advertisement: post.type === 'ADVERTISEMENT'
        }
    }));

    const selectMinEdgeRankScore = createSelector([selectNonAdPosts], newsfeed => {
        if (newsfeed.length === 0) {
            return 0;
        }
        return Math.min(...newsfeed.map(post => post.edge_rank_score));
    });

    const selectMaxEdgeRankScore = createSelector([selectNonAdPosts], newsfeed => {
        if (newsfeed.length === 0) {
            return 0;
        }
        return Math.max(...newsfeed.map(post => post.edge_rank_score));
    });

    const selectPostOwnerNodes = createSelector([selectNonAdPosts], newsfeed => newsfeed.map(post => {
        return {
            id: "u" + post.creator.id,
            name: post.creator.username,
            attr: [],
            color: "grey",
            type: 'user',
            isFollowedByCurrentUser: post.is_from_followed_user,
            affinityToCreator: post.affinity_score
        }
    }));

    const selectPostOwnerLinks = createSelector([selectNonAdPosts], newsfeed => newsfeed.map(post => {
        return {
            type: 'creator',
            color: 'grey',
            source: "u" + post.creator.id,
            target: "p" + post.id,
        }
    }));

    const selectPostLikerUserNodes = createSelector([selectNonAdPosts], newsfeed => newsfeed.flatMap(post => {
        return post.likes.reduce((users, like) => {
            users.push(
                {
                    id: "u" + like.creator.id,
                    name: like.creator.username,
                    attr: [],
                    color: "grey",
                    type: 'user',
                    // isFollowedByCurrentUser: post.is_from_followed_user,
                    affinityToCreator: post.affinity_score
                }
            )
            return users;
        }, []);
    }));

    const selectPostLikeLinks = createSelector([selectNonAdPosts], newsfeed => newsfeed.flatMap(post => {
        return post.likes.reduce((links, like) => {
            links.push({
                type: 'like',
                color: 'red',
                source: "u" + like.creator.id,
                target: "p" + post.id,
            });
            return links;
        }, []);
    }));

    const selectPostCommenterUserNodes = createSelector([selectNonAdPosts], newsfeed => newsfeed.flatMap(post => {
        return post.comments.reduce((users, comment) => {
            users.push(
                {
                    id: "u" + comment.creator.id,
                    name: comment.creator.username,
                    attr: [],
                    color: "grey",
                    type: 'user',
                    // isFollowedByCurrentUser: post.is_from_followed_user,
                    affinityToCreator: post.affinity_score
                }
            )
            return users;
        }, []);
    }));

    const selectPostCommentLinks = createSelector([selectNonAdPosts], newsfeed => newsfeed.flatMap(post => {
        return post.comments.reduce((links, comment) => {
            links.push({
                type: 'comment',
                color: 'green',
                source: "u" + comment.creator.id,
                target: "p" + post.id,
            });
            return links;
        }, []);
    }));

    const selectNodes = createSelector([selectPostNodes, selectPostOwnerNodes, selectPostLikerUserNodes, selectPostCommenterUserNodes],
        (postNodes, postOwnerNodes, postLikerUserNodes, postCommenterUserNodes) => {
            var array = postNodes.concat(postOwnerNodes);

            if (showLikes) {
                array = array.concat(postLikerUserNodes);
            }

            if (showComments) {
                array = array.concat(postCommenterUserNodes);
            }

            return array.filter((e, i) => array.findIndex(a => a['id'] === e['id']) === i);
        });

    const selectLinks = createSelector([selectPostLikeLinks, selectPostCommentLinks, selectPostOwnerLinks],
        (likeLinks, commentLinks, postOwnerLinks) => {
            var array = postOwnerLinks;

            if (showLikes) {
                array = array.concat(likeLinks);
            }

            if (showComments) {
                array = array.concat(commentLinks);
            }

            return array
            // return array.filter((e, i) => array.findIndex(a => a['id'] === e['id']) === i);
        });


    const resultNodes = selectNodes(posts)
    const resultLinks = selectLinks(posts)

    // useEffect(() => {
    //   // console.log(selectNodes(posts))
    // }, [selectNodes(posts)]);

    const selectPostOwnerUsernames = (posts) => posts.map(post => {
        return post.creator.username
    });

    // Styling
    const nodeCanvasObject = (node, ctx, globalScale) => {
        if (node.type === 'post') {
            // type post also contains advertisements

            const img = new Image();
            img.src = getImageSource(node.image);

            var size = 12;
            var sizeX = 12;
            var sizeY = 12;

            let imgWidth = img.width;
            let imgHeight = img.height;

            if (node.edgeRankScore && node.edgeRankScore > 0 && imgWidth > 0 && imgHeight > 0) {
                let maxWidth = 25;
                let maxHeight = 35;

                let minEdgeRankScore = selectMinEdgeRankScore(posts);
                let maxEdgeRankScore = selectMaxEdgeRankScore(posts);

                let edgeRankFactor = 1;

                if (maxEdgeRankScore !== minEdgeRankScore) {
                    // https://math.stackexchange.com/questions/3678939/what-function-can-be-used-used-to-map-all-possible-integers-from-a-large-interva
                    edgeRankFactor = (((node.edgeRankScore - minEdgeRankScore)) / (maxEdgeRankScore - minEdgeRankScore)) + 0.5;
                }

                let fraction = Math.min((maxWidth) / (imgWidth), (maxHeight) / (imgHeight)) * edgeRankFactor

                sizeX = img.width * fraction;
                sizeY = img.height * fraction;
            }

            let globalAlphaBackup = ctx.globalAlpha
            ctx.globalAlpha = 0.9; // make the image slightly transparent
            ctx.drawImage(img, node.x - sizeX / 2, node.y - sizeY / 2, sizeX, sizeY);
            ctx.globalAlpha = globalAlphaBackup; // restore original alpha
        } else {
            let label;
            switch (node.type) {
                case 'user':
                    label = node.name;
                    // label = t('newsfeed_post_affinity_score') + ": " + node.affinityToCreator;
                    break;
                default:
                    label = node.id;
            }
            const fontSize = 15 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.color;

            if (node.type === 'user') {
                if (node.name === user.username)
                    ctx.fillStyle = 'blue';

                if (node.isFollowedByCurrentUser)
                    ctx.fillStyle = 'black';
            }

            ctx.fillText(label, node.x, node.y);

            node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
        }
    };

    const nodePointerAreaPaint = (node, color, ctx) => {
        ctx.fillStyle = color;
        const bckgDimensions = node.__bckgDimensions;
        bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
    };

    return (
        <div className="w-full" id="network-graph-container">
            <h3 className="mt-5 p-3 font-bold text-md text-gray-600">{t('network_graph')}</h3>
            <p className="px-3 text-sm mb-5">
                {t('network_graph_explainer')}
            </p>

            <div className="px-3">
                <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        id="toggleShowAds"
                        className="form-checkbox"
                        checked={showAds}
                        onChange={(e) => setShowAds(e.target.checked)}
                    />
                    <label htmlFor="toggleShowAds" className="ml-2 text-sm">
                        {t('toggle_show_ads')}
                    </label>
                </div>

                <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        id="toggleShowLikes"
                        className="form-checkbox"
                        checked={showLikes}
                        onChange={(e) => setShowLikes(e.target.checked)}
                    />
                    <label htmlFor="toggleShowLikes" className="ml-2 text-sm">
                        {t('toggle_show_likes')}
                    </label>
                </div>

                <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        id="toggleShowComments"
                        className="form-checkbox"
                        checked={showComments}
                        onChange={(e) => setShowComments(e.target.checked)}
                    />
                    <label htmlFor="toggleShowComments" className="ml-2 text-sm">
                        {t('toggle_show_comments')}
                    </label>
                </div>
            </div>

            <ForceGraph2D
                ref={forceRef}
                width={document.getElementById('network-graph-container')?.clientWidth || 600}
                height={600}
                graphData={{
                    nodes: resultNodes,
                    links: resultLinks
                }}
                nodeAutoColorBy="group"
                nodeCanvasObject={nodeCanvasObject}
                nodePointerAreaPaint={nodePointerAreaPaint}
                enableNodeDrag={false}
                cooldownTicks={50}
                nodeRelSize={1}
                onEngineStop={() => {
                    if (initialCenter && forceRef && forceRef.current) {
                        forceRef.current.zoomToFit();
                    }
                    setInitialCenter(false);
                }}
            />
        </div>
    );
};

export default SocialGraph;
