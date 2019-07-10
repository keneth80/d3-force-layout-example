import { select, event } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { payments } from './data/mock-data';

export const excute = () => {
    const nodeData = payments;

    const linkData = [
        {
            source: 2,
            target: 1,
            type: '입금'
        },
        {
            source: 3,
            target: 1,
            type: '입금'
        },
        {
            source: 4,
            target: 1,
            type: '입금'
        },
        {
            source: 1,
            target: 5,
            type: '출금'
        },
        {
            source: 1,
            target: 6,
            type: '출금'
        },
        {
            source: 1,
            target: 7,
            type: '출금'
        },
        {
            source: 1,
            target: 8,
            type: '출금'
        },
        {
            source: 4,
            target: 9,
            type: '출금'
        },
        {
            source: 4,
            target: 10,
            type: '출금'
        },
        {
            source: 11,
            target: 2,
            type: '출금'
        }
    ];

    const d3ForceLayoutDragComponent = new D3ForceLayoutDragComponent({selector: '#result', nodeData, linkData});

    select('#btn').on('click', () => {
        // d3ZoomDragExample.update({
        //     x: 200, y:150, k: 1
        // });
    });
};

export class D3ForceLayoutDragComponent {
    constructor(configuration = {
        selector,
        nodeData,
        linkData
    }) {
        this.svg = null;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.selector = configuration.selector;

        this.nodeData = configuration.nodeData;
        this.linkData = configuration.linkData;

        this.colors = scaleOrdinal(schemeCategory10);
        this.node = null;
        this.link = null;
        this.edgepaths = null;
        this.edgelabels = null;

        // force layout
        this.simulation = null; 

        // zoom event variable
        this.zoomObj = null;

        // zoom event가 반영되어야 하는 target element
        this.zoomTarget = null;

        // transform 현상태를 저장 
        this.currentTransform = null;

        this.legendGroup = null;

        // legend data
        this.accountInOutData = [
            {
                label: '입금',
                color: '#364af7'
            },
            {
                label: '출금',
                color: '#f74a4a'
            }
        ];

        this.transactionCountData = [
            {
                label: '거래횟수 1',
                color: '#accbfc'
            },
            {
                label: '거래횟수 2',
                color: '#68a1fc'
            },
            {
                label: '거래횟수 3',
                color: '#6ff059'
            },
            {
                label: '거래횟수 4',
                color: '#524dff'
            },
            {
                label: '거래횟수 5건 이상',
                color: '#ed743b'
            }
        ];

        this.init();
        this.draw();
        this.drawLegend();
    }

    init() {
        const radius = 20;
        //svg create
        this.svg = select(this.selector)
            .append('svg')
                .attr('width', '100%')
                .attr('height', 600)
                .style('background', '#fff');

        this.svg.append('defs')
            .append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 13)
                .attr('markerHeight', 13)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#999')
                .style('stroke','none');

        this.svg.append('defs')
            .append('marker')
                .attr('id', 'arrowheadIn')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', this.accountInOutData[0].color)
                .style('stroke','none');

        this.svg.append('defs')
            .append('marker')
                .attr('id', 'arrowheadOut')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', this.accountInOutData[1].color)
                .style('stroke','none');
        
        // svg size check
        this.svgWidth = parseFloat(this.svg.style('width'));
        this.svgHeight = parseFloat(this.svg.style('height'));

        // force layout setup
        this.simulation = forceSimulation()
            .force('link', forceLink().id((d) => {
                return d.id;
            }).distance(250).strength(1))
            .force('box', () => {
                for (let i = 0, n = this.nodeData.length; i < n; ++i) {
                    const curr_node = this.nodeData[i];
                    curr_node.x = Math.max(radius, Math.min(this.svgWidth - radius, curr_node.x));
                    curr_node.y = Math.max(radius, Math.min(this.svgHeight - radius, curr_node.y));
                }
            })
            .force('charge', forceManyBody())
            .force('center', forceCenter(this.svgWidth / 2, this.svgHeight / 2));

        // zoom setup
        this.zoomObj = zoom().touchable(true) // touchable : mobile
            .scaleExtent([0.5, 2])
            .on('zoom', () => {
                this.currentTransform = event.transform;
                this.zoomTarget.attr('transform', this.currentTransform);
            });

        this.svg.call(
            this.zoomObj
        );

        // 도형 group
        this.zoomTarget = this.svg.append('g').attr('class', 'main-group');

        // legend group
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend-group')
            .attr('transform', (d) => {
                return 'translate(' + (this.svgWidth - 200) + ', 0)';
            });
    }

    draw() {
        this.update(this.nodeData, this.linkData);
    }

    drawLegend() {
        const accountInOutGroup = this.legendGroup.append('g')
            .attr('class', 'account-inout-group')
            .attr('transform', () => {
                return 'translate(0, 0)';
            });

        accountInOutGroup.append('rect')
            .attr('width', 200)
            .attr('height', 270)
            .style('fill', '#eee')
            .style('stroke', '#ccc')
            .style('stroke-width', 2);

        accountInOutGroup.selectAll('.account-rect').data(this.accountInOutData)
            .enter().append('rect')
                .attr('width', 25)
                .attr('height', 3)
                .attr('y', (d, i) => {
                    return i * 30 + ((i + 1) * 5) + 10;
                })
                .attr('x', 5)
                .style('fill', (d) => {
                    return d.color;
                });

        accountInOutGroup.selectAll('.account-label').data(this.accountInOutData)
            .enter().append('text')
                .attr('transform', (d, i) => {
                    return `translate(35, ${i * 30 + ((i + 1) * 5) + 16})`;
                })
                .text((d) => {
                    return d.label;
                });

        const transactionGroup = this.legendGroup.append('g')
            .attr('class', 'transaction-group')
            .attr('transform', () => {
                return 'translate(0, 80)';
            });

        transactionGroup.selectAll('.transaction-circle').data(this.transactionCountData)
            .enter().append('circle')
                .attr('r', 15)
                .attr('transform', (d, i) => {
                    return `translate(20, ${i * 30 + ((i + 1) * 5) + 16})`;
                })
                .style('fill', (d) => {
                    return d.color;
                });

        transactionGroup.selectAll('.transaction-label').data(this.transactionCountData)
            .enter().append('text')
                .attr('transform', (d, i) => {
                    return `translate(40, ${i * 30 + ((i + 1) * 5) + 20})`;
                })
                .text((d) => {
                    return d.label;
                });
    }

    update(nodes, links) {
        const radius = 20;
        this.link = this.zoomTarget.selectAll('.link')
            .data(links)
            .enter()
            .append('line')
            .attr('class', 'link')
            // .attr('marker-end','url(#arrowhead)')
            .attr('marker-end', (d) => {
                let returnValue = 'url(#arrowhead)';
                if (d.type === '출금') {
                    returnValue = 'url(#arrowheadOut)';
                } else {
                    returnValue = 'url(#arrowheadIn)';
                }
                return returnValue;
            })
            .style('stroke', (d) => {
                let color = this.accountInOutData.find((item) => item.label === d.type).color;
                return color;
            });
            
        this.link.append('title')
            .text((d) => {
                return d.type;
            });

        this.edgepaths = this.zoomTarget.selectAll('.edgepath')
            .data(links)
            .enter()
            .append('path')
            .attr('class', 'edgepath')
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', (d, i) => {
                return 'edgepath' + i;
            })
            .style('pointer-events', 'none');

        this.edgelabels = this.zoomTarget.selectAll('.edgelabel')
            .data(links)
            .enter()
            .append('text')
            .style('pointer-events', 'none')
            .attr('class', 'edgelabel')
            .attr('id', (d, i) => {
                return 'edgelabel' + i
            })
            .attr('font-size', 10)
            .attr('font-weight', 100)
            .attr('stroke-width', 2)
            .attr('fill', '#000');

        this.edgelabels.append('textPath')
            .attr('xlink:href', (d, i) => {
                return '#edgepath' + i
            })
            .attr('stroke-width', 2)
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .attr('startOffset', '50%')
            .text((d) => {
                return d.type;
            });

        this.node = this.zoomTarget.selectAll('.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(drag()
                    .on('start', (d) => {
                        this.simulation.alphaTarget(0.3).restart();
                        // if (!event.active) this.simulation.alphaTarget(0.3).restart()
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (d) => {
                        d.fx = Math.max(radius, Math.min(this.svgWidth - radius, event.x));
                        d.fy = Math.max(radius, Math.min(this.svgHeight - radius, event.y));
                    })
                    .on('end', () => {
                        this.simulation.alphaTarget(0.3).stop();
                    })
            );

        this.node.append('circle')
            .attr('r', radius)
            .style('fill', (d, i) => {
                let color = '#fff';
                if (d.transactionCount === 0) {

                } else if (d.transactionCount === 1) {
                    color = '#accbfc';
                } else if (d.transactionCount === 2) {
                    color = '#68a1fc';
                } else if (d.transactionCount === 3) {
                    color = '#6ff059';
                } else if (d.transactionCount === 4) {
                    color = '#524dff';
                } else if (d.transactionCount > 4) {
                    color = '#ed743b';
                }
                return color;
                // return this.colors(i);
            });

        this.node.append('title')
            .text((d) => {
                return d.id;
            });

        this.node.append('text')
            .attr('dy', () => {
                return 5;
            })
            .style('font-size', 'small')
            .text((d) => {
                return d.name;
                // return d.name + ':' + d.label;
            })
            .attr('dx', (d, i, nodeList) => {
                const textWidth = select(nodeList[i]).node().getComputedTextLength();
                return (textWidth/2)*-1;
            });

        this.simulation
            .nodes(nodes)
            .on('tick', () => {
                this.ticked();
            });

        this.simulation.force('link')
            .links(links);

        setTimeout(() => {
            this.simulation.stop();
        }, 2000); 
    }

    ticked() {
        this.link
            .attr('x1', (d) => {
                return d.source.x;
            })
            .attr('y1', (d) => {
                return d.source.y;
            })
            .attr('x2', (d) => {
                return d.target.x;
            })
            .attr('y2', (d) => {
                return d.target.y;
            });

        this.node
            .attr('transform', (d) => {
                return 'translate(' + d.x + ', ' +  d.y + ')';
            });

        this.edgepaths.attr('d', (d) => {
            return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
        });

        this.edgelabels.attr('transform', (d, i, nodeList) => {
            if (d.target.x < d.source.x) {
                const bbox = select(nodeList[i]).node().getBBox();

                const rx = bbox.x + bbox.width / 2;
                const ry = bbox.y + bbox.height / 2;
                return 'rotate(180 ' + rx + ' ' + ry + ')';
            } else {
                return 'rotate(0)';
            }
        });
    }
}

export const getTextWidth = (text, fontSize, fontFace) => {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    context.font = fontSize + 'px ' + fontFace;
    const returnValue = context.measureText(text).width;
    canvas = null;
    context = null;
    return returnValue;
};