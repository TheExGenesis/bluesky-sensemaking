
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function ScatterPlot() {
  const data = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 30 },
    { x: 4, y: 40 },
    { x: 5, y: 50 },
  ];

  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const xScale = d3
      .scaleLinear()
      .domain([0, 6])
      .range([50, 450]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 60])
      .range([450, 50]);

    svg
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5);

    svg
      .select('#x-axis')
      .call(d3.axisBottom(xScale))
      .attr('transform', 'translate(0,450)');

    svg
      .select('#y-axis')
      .call(d3.axisLeft(yScale))
      .attr('transform', 'translate(50,0)');
  }, [data]);

  return (
    <div id="plot-container">
      <svg ref={svgRef} width={500} height={500}>
        <g id="x-axis" />
        <g id="y-axis" />
      </svg>
    </div>
  );
}

export default ScatterPlot;
