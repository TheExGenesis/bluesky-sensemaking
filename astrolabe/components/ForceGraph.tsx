import React, { useRef, useEffect, useState, MouseEvent, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import PostLight from './PostLight';
import { BskyAgent } from '@atproto/api';
import { GraphData } from '@/pages/graph/[username]';
import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import * as bsky from '@atproto/api';
import { ExpandedPostView } from '@/helpers/contentTypes';
import { BaseType, SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import { FocusedPostState } from './TweetList';

export type Node = {
  id: string;
  group: string | number;
  post?: bsky.AppBskyFeedDefs.PostView;
};

export type Link = {
  source: string;
  target: string;
};
type D3MouseEvent = d3.D3DragEvent<any, any, any> & {
  target: BaseType & { __data__: Node };
  pageX: number;
  pageY: number;
};

type simNodeWID = d3.SimulationNodeDatum & { id: string; x?: number; y?: number };

type SelectionLink = d3.Selection<
  d3.BaseType | SVGLineElement,
  {
    source: any;
    target: any;
  },
  SVGGElement,
  unknown
>;
type SelectionNode = d3.Selection<d3.BaseType | SVGCircleElement, simNodeWID, SVGGElement, unknown>;

type ForceGraphOptions = {
  nodeId?: (d: Node) => string;
  nodeGroup?: (d: Node) => string | number;
  nodeGroups?: (string | number)[];
  nodeTitle?: ((d: Node) => string) | ((d: Node, i: number) => string);
  nodeFill?: string;
  nodeStroke?: string;
  nodeStrokeWidth?: number;
  nodeStrokeOpacity?: number;
  nodeRadius?: number | ((d: Node) => number);
  nodeStrength?: (d: SimulationNodeDatum, i: number, data: SimulationNodeDatum[]) => number;
  linkSource?: (d: Link) => string;
  linkTarget?: (d: Link) => string;
  linkStroke?: string;
  linkStrokeOpacity?: number;
  linkStrokeWidth?: number;
  linkStrokeLinecap?: string;
  linkStrength?: (d: Link) => number;
  colors?: readonly string[];
  width?: number;
  height?: number;
  invalidation?: Promise<void>;
};

type ForceGraphProps = {
  nodes: Node[];
  links: Link[];
  agent: BskyAgent;
  options?: ForceGraphOptions;
  focusedPostState: FocusedPostState;
};

const Tooltip = (props: { agent: BskyAgent; post: bsky.AppBskyFeedDefs.PostView | null }) => {
  const { agent, post } = props;

  // useEffect(() => {console.log('tooltip', {post})}, [post])
  return (
    post && (
      <div
        className="tooltip"
        style={{
          opacity: 0,
          backgroundColor: 'white',
          border: 'solid',
          borderWidth: '2px',
          borderRadius: '5px',
          padding: '5px',
          position: 'absolute',
          display: 'none',
        }}
      >
        <PostLight
          key={post.cid}
          post={{
            postView: post as ExpandedPostView,
          }}
        />
      </div>
    )
  );
};

function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
  function dragstarted(event: d3.D3DragEvent<any, any, any>) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<any, any, any>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<any, any, any>) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
}

const mousemove = function (d: MouseEvent) {
  // Tooltip
  d3.select('.tooltip')
    // .style("left", (d3.pointer(d)[0]) + "px")
    // .style("top", (d3.pointer(d)[1]) + "px")
    .style('left', d.pageX + 'px')
    .style('top', d.pageY + 'px');
};

function intern(value: { valueOf: () => any } | null) {
  return value !== null && typeof value === 'object' ? value.valueOf() : value;
}

function ForceGraph(props: {
  nodes: Node[]; // an iterable of node objects (typically [{id}, …])
  links: Link[]; // an iterable of link objects (typically [{source, target}, …])
  options: Partial<ForceGraphOptions>;
  focusedPostState: FocusedPostState;
}) {
  const { nodes, links, options, focusedPostState } = props;
  var {
    nodeId = (d: Node) => d.id,
    nodeGroup,
    nodeGroups,
    nodeTitle,
    nodeFill = 'currentColor',
    nodeStroke = '#fff',
    nodeStrokeWidth = 1.5,
    nodeStrokeOpacity = 1,
    nodeRadius = 7,
    nodeStrength,
    linkSource = ({ source }: Link) => source,
    linkTarget = ({ target }: Link) => target,
    linkStroke = '#999',
    linkStrokeOpacity = 0.6,
    linkStrokeWidth = 1.5,
    linkStrokeLinecap = 'round',
    linkStrength,
    colors = d3.schemeTableau10,
    width = 640,
    height = 400,
    invalidation,
  } = options;

  const svgRef = useRef<SVGSVGElement>(null);
  const [focusedPostId, setFocusedPostId] = focusedPostState;

  // when focusedPostId changes, highlight the corresponding node, and unhighlight the others
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('.node').style('stroke', (d: Node) => (d.id === focusedPostId ? 'red' : 'black'));
    svg.selectAll('.node').style('opacity', (d: Node) => (d.id === focusedPostId ? 1 : 0.2));
  }, [focusedPostId]);

  useLayoutEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const mouseenter = function (d: D3MouseEvent) {
      timeoutId = setTimeout(() => {
        setFocusedPostId(d.target?.__data__?.id);
      }, 1000);
      // console.log('mouseover', d)

      // Tooltip
      d3.select('.tooltip')
        .style('display', 'block')
        .style('opacity', 1)
        .style('left', d.pageX + 'px')
        .style('top', d.pageY + 'px');

      d3.select(d.target).style('stroke', 'red').style('opacity', 1);
    };

    const mouseleave = function (d: D3MouseEvent) {
      clearTimeout(timeoutId);
      setFocusedPostId(null);
      // Tooltip
      d3.select('.tooltip').style('opacity', 0).style('left', 0).style('top', 0).style('display', 'none');

      d3.select(d.target).style('stroke', 'none').style('opacity', 0.8);
    };

    const nodeclick = function (d: D3MouseEvent) {
      setFocusedPostId(d.target?.__data__?.id);
    };

    const bgclick = function (d: MouseEvent<SVGElement, unknown>) {
      if (d.target === svg.node()) {
        // Do something with the clicked SVG element
        // setFocusedPostId(null);
      }
    };

    const N = d3.map(nodes, nodeId).map(intern);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) {
      nodeTitle = (_: Node, i: number) => N[i].toString();
    }
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== 'function' ? null : d3.map(links, linkStrokeWidth);

    // Replace the input nodes and links with mutable objects for the simulation.
    var nodesSim: simNodeWID[] = d3.map(nodes, (_, i) => ({ id: N[i] }));
    var linksSim = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);
    const nodeGroupsSim = nodeGroups as (string | number)[];

    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroupsSim, colors);

    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(linksSim).id(({ index: i }) => N[i as number]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);

    const simulation = d3
      .forceSimulation(nodesSim)
      .force('link', forceLink)
      .force('charge', forceNode)
      .force('x', d3.forceX())
      .force('y', d3.forceY());

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    svg.selectAll('*').remove();
    svg.on('click', bgclick);

    const link = svg
      .append('g')
      .attr('stroke', linkStroke)
      .attr('stroke-opacity', linkStrokeOpacity)
      .attr('stroke-width', typeof linkStrokeWidth !== 'function' ? linkStrokeWidth : null)
      .attr('stroke-linecap', linkStrokeLinecap)
      .selectAll('line')
      .data(linksSim)
      .join('line');

    // .attr('marker-end', (d) => `url(${new URL(`#arrow`, location)})`);

    // @ts-ignore
    if (W) link.attr('stroke-width', ({ index: i }) => W[i]);

    const node = svg
      .append('g')
      .attr('fill', nodeFill)
      .attr('stroke', nodeStroke)
      .attr('stroke-opacity', nodeStrokeOpacity)
      .attr('stroke-width', nodeStrokeWidth)
      .selectAll('circle')
      .data(nodesSim)
      .join('circle')
      .attr('id', (d) => `node-${d.id}`)
      .attr('r', nodeRadius)
      // @ts-ignore
      .call(drag(simulation))
      // .on('mouseenter', mouseenter)
      // .on('mouseleave', mouseleave)
      // .on('mousemove', mousemove)
      .on('click', nodeclick);

    if (G && color) node.attr('fill', ({ index: i }) => color(G[i as number]));
    // @ts-ignore
    if (T) node.append('title').text(({ index: i }) => T[i]);

    // Handle invalidation.
    if (invalidation != null) invalidation.then(() => simulation.stop());

    function ticked(link: SelectionLink, node: SelectionNode) {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      // @ts-ignore
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    }

    simulation.on('tick', () => ticked(link, node));

    return () => {
      clearTimeout(timeoutId);
      simulation.stop();
    };
  }, [nodes, links]);

  useEffect(() => {
    console.log('focusedPostId', focusedPostId);
    d3.selectAll('circle').style('stroke', 'none').style('opacity', 0.8);
    if (focusedPostId) {
      d3.select(`#node-${focusedPostId}`).style('stroke', 'red').style('opacity', 1);
    }
  }, [focusedPostId]);

  return <svg ref={svgRef} width={width} height={height} />;
}

const invalidation: Promise<void> = new Promise((resolve) => {
  // do something to stop the simulation when necessary
  // @ts-ignore
  resolve();
});

// const ForceGraph: React.FC<ForceGraphProps> = (props:{ nodes, links, agent, focusedPostState, options}) => {
export const ForceGraphUI = (props: {
  agent: BskyAgent;
  graph: GraphData;
  nodeDict: Record<string, Node>;
  focusedPostState: FocusedPostState;
  identifier: string;
}) => {
  const { agent, graph, nodeDict, focusedPostState, identifier } = props;
  const topGraphContainerRef = useRef<HTMLDivElement | null>(null);
  // const [focusedPostIdx, setFocusedPostIdx] = useState<bsky.AppBskyFeedDefs.FeedViewPost | null>(null);
  const [focusedPostId, setFocusedPostId] = focusedPostState;
  const [focusedPost, setFocusedPost] = useState<bsky.AppBskyFeedDefs.PostView | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!focusedPostId) {
    }

    if (focusedPostId in nodeDict) {
      const post = nodeDict[focusedPostId];
      if (post.post) {
        setFocusedPost(post.post);
      }
    } else {
      console.log('no post found');
      return;
    }
  }, [focusedPostId]);

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    function handleResize() {
      // Get the dimensions of the container
      const container = topGraphContainerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      const height = Math.round(container.clientHeight * 0.66);

      // Update the state with the new width
      setWidth(width);
      setHeight(height);
    }

    // Update the dimensions on mount and window resize
    handleResize();
    window.addEventListener('resize', handleResize);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex-1 flex-grow">
      <h1 className="flex-none">Graph for {identifier}</h1>
      <div id="top_level_container" ref={topGraphContainerRef} className="flex-1 flex-grow h-full overflow-hidden">
        <ForceGraph
          nodes={graph.nodes}
          links={graph.links}
          options={{
            nodeId: (d) => d.id,
            nodeGroup: (d) => d.group,
            // nodeTitle: (d) => `${d.id} (${d.group})`,
            nodeTitle: undefined,
            width: width ?? 960,
            height: height ?? 680,
            invalidation,
            nodeRadius: (d) => Math.log(d.post ? d.post?.likeCount ?? 1 : 1) * 100,
          }}
          focusedPostState={focusedPostState}
        />
      </div>
      <Tooltip agent={agent} post={focusedPost} />
    </div>
  );
};

export default ForceGraph;
