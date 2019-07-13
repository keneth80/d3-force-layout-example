import { select, event } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { scaleOrdinal } from 'd3-scale';
import { format } from 'd3-format';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { payments } from './data/mock-data';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export const excute = () => {
    const nodeData = payments;

    const linkData = [
        {
            source: 2,
            target: 1,
            type: '입금',
            account: '5000000000'
        },
        {
            source: 3,
            target: 1,
            type: '입금',
            account: '320000000'
        },
        {
            source: 4,
            target: 1,
            type: '입금',
            account: '40000000'
        },
        {
            source: 1,
            target: 5,
            type: '출금',
            account: '500000000'
        },
        {
            source: 1,
            target: 6,
            type: '출금',
            account: '430000000'
        },
        {
            source: 1,
            target: 7,
            type: '출금',
            account: '10000000'
        },
        {
            source: 1,
            target: 8,
            type: '출금',
            account: '9000000000'
        },
        {
            source: 4,
            target: 9,
            type: '출금',
            account: '600000'
        },
        {
            source: 4,
            target: 10,
            type: '출금',
            account: '8401110'
        },
        {
            source: 11,
            target: 2,
            type: '출금',
            account: '90000000'
        },
        {
            source: 2,
            target: 11,
            type: '입금',
            account: '2498000'
        }
    ];

    const d3ForceLayoutDragComponent = new D3ForceLayoutDragComponent({selector: '#result', nodeData, linkData});

    select('#search_btn').on('click', () => {
        const target = payments.find((item) => item.name === document.search.name.value);
        let tempPayments = payments.filter((item) => {
            if (parseInt(item.transactionCount) >= parseInt(document.search.account_count.value)) {
                return true;
            } else {
                return false;
            }
        });

        const tempFilterData = tempPayments.filter((item) => {
            if (item.label === document.search.name.value) {
                return false;
            } else {
                return true;
            }
        });

        let tempLink = [];
        if (document.search.type.value === '전체') {
            for (let i = 0; i < tempFilterData.length; i++) {
                tempLink.push({
                    source: tempFilterData[i].id,
                    target: target ? target.id : 1,
                    type: '출금',
                    account: tempFilterData[i].amountDeposit + tempFilterData[i].amountPaid
                });
            }
    
            for (let i = 5; i < tempFilterData.length; i++) {
                tempLink.push({
                    source: tempFilterData[i].id,
                    target: target ? target.id : 1,
                    type: '입금',
                    account: tempFilterData[i].amountDeposit + tempFilterData[i].amountPaid
                });
            }
        } else {
            for (let i = 0; i < tempFilterData.length; i++) {
                tempLink.push({
                    source: tempFilterData[i].id,
                    target: target ? target.id : 1,
                    type: document.search.type.value,
                    account: tempFilterData[i].amountDeposit + tempFilterData[i].amountPaid
                });
            }
        }

        tempLink = tempLink.map((item) => {
            if (document.search.type.value !== '전체') {
                item.type = document.search.type.value;
            }
            return item;
        })

        d3ForceLayoutDragComponent.updateData(tempFilterData, tempLink);
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

        this.numberFmt = format(',d');

        // force layout
        this.simulation = null; 

        // zoom event variable
        this.zoomObj = null;

        // zoom event가 반영되어야 하는 target element
        this.zoomTarget = null;

        // transform 현상태를 저장 
        this.currentTransform = null;

        this.legendGroup = null;

        this.detailGroup = null;

        this.isDrag = false;

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
                color: '#c8faf6'
            },
            {
                label: '거래횟수 2',
                color: '#68a1fc'
            },
            {
                label: '거래횟수 3',
                color: '#524dff'
            },
            {
                label: '거래횟수 4',
                color: '#fac13c'
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
                .style('background', '#f0f2f2')
                .on('click', () => {
                    this.detailGroup.selectAll('*').remove();
                });

        const defs = this.svg.append('defs');
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 29)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowheadIn')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 29)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', this.accountInOutData[0].color)
            .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowheadOut')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 29)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', this.accountInOutData[1].color)
            .style('stroke','none');

        const dropShadowFilter = defs.append('svg:filter')
            .attr('id', 'dropshadow')
            .attr('filterUnits', 'userSpaceOnUse')
            .attr('width', '250%')
            .attr('height', '250%');
        dropShadowFilter.append('svg:feGaussianBlur')
            .attr('in', 'SourceGraphic')
            .attr('stdDeviation', 2)
            .attr('result', 'blur-out');
        dropShadowFilter.append('svg:feColorMatrix')
            .attr('in', 'blur-out')
            .attr('type', 'hueRotate')
            .attr('values', 180)
            .attr('result', 'color-out');
        dropShadowFilter.append('svg:feOffset')
            .attr('in', 'color-out')
            .attr('dx', 3)
            .attr('dy', 3)
            .attr('result', 'the-shadow');
        dropShadowFilter.append('svg:feBlend')
            .attr('in', 'SourceGraphic')
            .attr('in2', 'the-shadow')
            .attr('mode', 'normal');
        
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
                if (this.detailGroup.selectAll('*').nodes().length) {
                    this.detailGroup.selectAll('*').remove();
                }
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

        // detail group
        this.detailGroup = this.svg.append('g')
            .attr('class', 'detail-group')
            .attr('filter', 'url(#dropshadow)');

        const resizeEvent = fromEvent(window, 'resize').pipe(debounceTime(500));
        resizeEvent.subscribe(() => {
            if (!this.svg) return;

            this.svgWidth = parseInt(this.svg.style('width'));
            this.svgHeight = parseInt(this.svg.style('height'));

            this.legendGroup.attr('transform', () => {
                return 'translate(' + (this.svgWidth - 200) + ', 0)';
            });
        });
    }

    draw() {
        this.simulation.alphaTarget(0.3).restart();
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
            .style('fill', '#bababa')
            .style('stroke', '#000')
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
                .attr('filter', 'url(#dropshadow)')
                .style('stroke', '#fff')
                .style('stroke-width', 2)
                .style('fill', (d) => {
                    return d.color;
                });

        transactionGroup.selectAll('.transaction-label').data(this.transactionCountData)
            .enter().append('text')
                .attr('transform', (d, i) => {
                    return `translate(40, ${i * 30 + ((i + 1) * 5) + 22})`;
                })
                .text((d) => {
                    return d.label;
                });
    }

    updateData(nodes, links) {
        this.nodeData = nodes;
        this.linkData = links;
        this.zoomTarget.remove();
        this.zoomTarget = this.svg.append('g').attr('class', 'main-group');
        this.simulation.alphaTarget(0.3).restart();
        this.update(nodes, links);
        setTimeout(() => {
            this.svg.node().appendChild(this.legendGroup.node());
        }, 500);
        
    }

    update(nodes, links) {
        const radius = 22;
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
            .style('font-size', 14)
            .style('font-weight', 200)
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .attr('startOffset', '50%')
            .text((d) => {
                return this.numberFmt(d.account);
                // return d.type + ':' + d.account;
            });
            // .on('click', (d) => {
            //     event.preventDefault();
            //     event.stopPropagation();
                
            //     this.detailGroup.attr('transform', `translate(${event.offsetX}, ${event.offsetY})`);
            //     this.detailGroup.selectAll('.detail-background')
            //         .data(['rect'])
            //         .join(
            //             (enter) => enter.append('rect').attr('class', 'detail-background'),
            //             (update) => update,
            //             (exit) => exit.remove()
            //         )
            //         .attr('width', 230)
            //         .attr('height', 90)
            //         .style('fill', '#a6c8ff')
            //         .style('stroke', '#000')
            //         .style('rx', 10)
            //         .style('ry', 10);

            //     const targetInfo = this.nodeData.find((item) => item.id === d.target);

            //     const labels = [
            //         {
            //             key: 'accountNumber',
            //             label: '계좌번호',
            //             value: targetInfo.accountNumber
            //         },
            //         {
            //             key: 'transactionType',
            //             label: '거래종류',
            //             value: targetInfo.transactionType
            //         },
            //         {
            //             key: 'account',
            //             label: '금액',
            //             value: d.account
            //         },
            //         {
            //             key: 'briefs',
            //             label: '적요',
            //             value: targetInfo.briefs
            //         },
            //         {
            //             key: 'financialInstitution',
            //             label: '금융기관',
            //             value: targetInfo.financialInstitution
            //         },
            //         {
            //             key: 'shopName',
            //             label: '취급점',
            //             value: targetInfo.shopName
            //         }
            //     ];

            //     const labelelements = this.detailGroup.selectAll('.detail-label')
            //         .data(labels)
            //         .join(
            //             (enter) => enter.append('text').attr('class', 'detail-label'),
            //             (update) => update,
            //             (exit) => exit.remove()
            //         )
            //         .attr('x', 65)
            //         .attr('y', (d, i) => {
            //             return i * 20 + 20;
            //         })
            //         .attr('width', 70)
            //         .style('fill', '#314d7a')
            //         .style('text-anchor', 'end')
            //         .text((d) => {
            //             return d.label;
            //         });
                
            //     this.detailGroup.selectAll('.detail-value')
            //         .data(labels)
            //         .join(
            //             (enter) => enter.append('text').attr('class', 'detail-value'),
            //             (update) => update,
            //             (exit) => exit.remove()
            //         )
            //         .attr('x', 80)
            //         .attr('y', (d, i) => {
            //             return i * 20 + 20;
            //         })
            //         .attr('width', 70)
            //         .style('text-anchor', 'start')
            //         .text((d) => {
            //             let returnValue = '';
            //             if (d.key === 'balance') {
            //                 returnValue = this.numberFmt(d.value);
            //             } else {
            //                 returnValue = d.value;
            //             }
            //             return returnValue;
            //         });
            // });

        this.node = this.zoomTarget.selectAll('.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('filter', 'url(#dropshadow)')
            .call(drag()
                    .on('start', (d) => {
                        this.detailGroup.selectAll('*').remove();
                        // if (!event.active) this.simulation.alphaTarget(0.3).restart()
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (d) => {
                        if (!this.isDrag) {
                            this.simulation.alphaTarget(0.3).restart();
                            this.isDrag = true;
                        }

                        d.fx = Math.max(radius, Math.min(this.svgWidth - radius, event.x));
                        d.fy = Math.max(radius, Math.min(this.svgHeight - radius, event.y));
                    })
                    .on('end', () => {
                        this.isDrag = false;
                        this.simulation.alphaTarget(0.3).stop();
                    })
            )
            .on('click', (d) => {
                event.preventDefault();
                event.stopPropagation();
                const boxHeight = 110;
                const boxWidth = 380;
                this.detailGroup.attr('transform', `translate(${event.offsetX}, ${event.offsetY})`);
                const background = this.detailGroup.selectAll('.detail-background')
                    .data(['rect'])
                    .join(
                        (enter) => enter.append('rect').attr('class', 'detail-background'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('width', boxWidth)
                    .attr('height', boxHeight)
                    .style('fill', '#a6c8ff')
                    .style('stroke', '#000')
                    .style('rx', 10)
                    .style('ry', 10);

                const labels = [
                    {
                        key: 'name',
                        label: '이름',
                        value: d.name
                    },
                    {
                        key: 'accountNumber',
                        label: '계좌번호',
                        value: d.accountNumber
                    },
                    {
                        key: 'financialInstitution',
                        label: '금융기관',
                        value: d.financialInstitution
                    },
                    {
                        key: 'balance',
                        label: '잔금',
                        value: d.balance
                    }
                ];

                const labelelements = this.detailGroup.selectAll('.detail-label')
                    .data(labels)
                    .join(
                        (enter) => enter.append('text').attr('class', 'detail-label'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 65)
                    .attr('y', (d, i) => {
                        return i * 20 + 20;
                    })
                    .attr('width', 70)
                    .style('fill', '#314d7a')
                    .style('text-anchor', 'end')
                    .text((d) => {
                        return d.label;
                    });
                
                this.detailGroup.selectAll('.detail-value')
                    .data(labels)
                    .join(
                        (enter) => enter.append('text').attr('class', 'detail-value'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 80)
                    .attr('y', (d, i) => {
                        return i * 20 + 20;
                    })
                    .attr('width', 70)
                    .style('text-anchor', 'start')
                    .text((d) => {
                        let returnValue = '';
                        if (d.key === 'balance') {
                            returnValue = this.numberFmt(d.value);
                        } else {
                            returnValue = d.value;
                        }
                        return returnValue;
                    });

                const accounts = links.filter((item) => {
                    if (item.source.id === d.id || item.target.id === d.id) {
                        return true;
                    } else {
                        return false;
                    }
                });

                this.detailGroup.selectAll('.account-label')
                    .data(['label'])
                    .join(
                        (enter) => enter.append('text').attr('class', 'account-label'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 65)
                    .attr('y', (d, i) => {
                        return (labels.length) * 20 + 20;
                    })
                    .attr('width', 70)
                    .style('fill', '#314d7a')
                    .style('text-anchor', 'end')
                    .text('거래내역');

                const accountGroup = this.detailGroup.selectAll('.account-value-group')
                    .data(['label'])
                    .join(
                        (enter) => enter.append('g').attr('class', 'account-value-group'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('transform', `translate(80, ${(labels.length - 1) * 20 + 20})`);

                accountGroup.selectAll('.account-value-type')
                    .data(accounts)
                    .join(
                        (enter) => enter.append('text').attr('class', 'account-value-type'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 0)
                    .attr('y', (d, i) => {
                        return i * 20 + 20;
                    })
                    .attr('width', 150)
                    .style('fill', '#314d7a')
                    .text((d) => {
                        return d.target.transactionType;
                    });

                accountGroup.selectAll('.account-value-number')
                    .data(accounts)
                    .join(
                        (enter) => enter.append('text').attr('class', 'account-value-number'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 40)
                    .attr('y', (d, i) => {
                        return i * 20 + 20;
                    })
                    .attr('width', 150)
                    .style('fill', '#314d7a')
                    .text((d) => {
                        return d.target.accountNumber;
                    });

                accountGroup.selectAll('.account-value-paid')
                    .data(accounts)
                    .join(
                        (enter) => enter.append('text').attr('class', 'account-value-paid'),
                        (update) => update,
                        (exit) => exit.remove()
                    )
                    .attr('x', 180)
                    .attr('y', (d, i) => {
                        return i * 20 + 20;
                    })
                    .attr('width', 150)
                    .style('fill', '#314d7a')
                    .text((d) => {
                        return d.target.amountPaid > 0 ? d.target.amountPaid : d.target.amountDeposit;
                    });
                
                background.attr('height', boxHeight + (accounts.length - 1) * 20);
                
                console.log('accountIds : ', accounts, links);
            });

        this.node.append('circle')
            .attr('r', radius)
            .style('stroke', '#fff')
            .style('stroke-width', 2)
            .style('fill', (d, i) => {
                let color = '#fff';
                if (d.transactionCount === 0) {

                } else if (d.transactionCount === 1) {
                    color = '#c8faf6';
                } else if (d.transactionCount === 2) {
                    color = '#68a1fc';
                } else if (d.transactionCount === 3) {
                    color = '#524dff';
                } else if (d.transactionCount === 4) {
                    color = '#fac13c';
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
            .style('stroke', (d, i) => {
                let color = '#000';
                if (d.transactionCount > 2) {
                    color = '#fff';
                }
                return color;
                // return this.colors(i);
            })
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