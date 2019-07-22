import { select, event, mouse } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';
import { scaleOrdinal } from 'd3-scale';
import { format } from 'd3-format';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { csv } from 'd3-fetch';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, map, buffer, delay, filter } from 'rxjs/operators';

export const excute = (doc, isMock = false) => {
    let originData = [];
    if (!isMock) {
        // select('#add_btn').on('click', () => {
        //     doc.d3ForceLayoutDragComponent.addData([
        //         {
        //             AmountDeposit: 0,
        //             AmountPaid: 5555038000,
        //             Balance: 2498000,
        //             Bank: '중소기업은행',
        //             Briefs: '학원비',
        //             CurrencySeparation: 'KRW',
        //             FinancialInstitution: '중소기업은행',
        //             ForeignCurrencyTransactionAmt: '0.00',
        //             InAccountNumber: '23144551728222',
        //             Name: '나나비',
        //             NameNo: '8401271111222',
        //             OutAccountNumber: '99988877744433',
        //             ShopName: '애오개',
        //             TransactionChannel: '대체',
        //             TransactionCount: 27,
        //             TransactionDate: '2/1/19',
        //             TransactionMeans: '인터넷뱅킹',
        //             TransactionTime: '16:41:13',
        //             TransactionType: '입금',
        //             id: 2,
        //             index: 0
        //             },
        //             {
        //             AmountDeposit: 0,
        //             AmountPaid: 600000,
        //             Balance: 3200999222,
        //             Bank: '신한은행',
        //             Briefs: '이전비',
        //             CurrencySeparation: 'KRW',
        //             FinancialInstitution: '한국은행',
        //             ForeignCurrencyTransactionAmt: '0.00',
        //             InAccountNumber: '99988877744433',
        //             Name: '김사랑',
        //             NameNo: '1231231231100',
        //             OutAccountNumber: '772001119977220',
        //             ShopName: '본점',
        //             TransactionChannel: '대체',
        //             TransactionCount: 1,
        //             TransactionDate: '3/11/19',
        //             TransactionMeans: '창구',
        //             TransactionTime: '9:00:30',
        //             TransactionType: '출금',
        //             id: 3,
        //             index: 1
        //             }
        //     ]);
        // })
        const d3ForceLayoutDragComponent = new D3ForceLayoutDragComponent({selector: '#result', nodeData: [], linkData: []});
        if (doc) {
            doc.d3ForceLayoutDragComponent = d3ForceLayoutDragComponent;
            // doc.d3ForceLayoutDragComponent.updateOnlyNode([
            //     {
            //         AmountDeposit: 0,
            //         AmountPaid: 5555038000,
            //         Balance: 2498000,
            //         Bank: '중소기업은행',
            //         Briefs: '학원비',
            //         CurrencySeparation: 'KRW',
            //         FinancialInstitution: '중소기업은행',
            //         ForeignCurrencyTransactionAmt: '0.00',
            //         InAccountNumber: '23144551728222',
            //         Name: '홍길동',
            //         NameNo: '8401271111222',
            //         OutAccountNumber: '99988877744433',
            //         ShopName: '애오개',
            //         TransactionChannel: '대체',
            //         TransactionCount: 27,
            //         TransactionDate: '2/1/19',
            //         TransactionMeans: '인터넷뱅킹',
            //         TransactionTime: '16:41:13',
            //         TransactionType: '입금',
            //         id: 1,
            //         index: 0
            //         },
            //         {
            //         AmountDeposit: 0,
            //         AmountPaid: 600000,
            //         Balance: 3200999222,
            //         Bank: '신한은행',
            //         Briefs: '이전비',
            //         CurrencySeparation: 'KRW',
            //         FinancialInstitution: '한국은행',
            //         ForeignCurrencyTransactionAmt: '0.00',
            //         InAccountNumber: '99988877744433',
            //         Name: '김사기',
            //         NameNo: '1231231231100',
            //         OutAccountNumber: '772001119977220',
            //         ShopName: '본점',
            //         TransactionChannel: '대체',
            //         TransactionCount: 1,
            //         TransactionDate: '3/11/19',
            //         TransactionMeans: '창구',
            //         TransactionTime: '9:00:30',
            //         TransactionType: '출금',
            //         id: 2,
            //         index: 1
            //         }
            // ]);
        }
        return;
    }

    csv('./component/data/mock-data.csv', (data, index) => {
        data.AmountDeposit = parseInt(data.AmountDeposit) || 0;
        data.AmountPaid = parseInt(data.AmountPaid) || 0;
        data.Balance = parseInt(data.Balance) || 0;
        data.id = index;
        return data;
    }).then((mock) => {
        const linkData = [];
        let nodeData = [];
        const d3ForceLayoutDragComponent = new D3ForceLayoutDragComponent({selector: '#result', nodeData, linkData});
        if (doc) {
            doc.d3ForceLayoutDragComponent = d3ForceLayoutDragComponent;
        }
        
        // 맨 앞단은 컬럼명이 명시되어 있어 잘라낸다.
        originData = mock.slice(1);
        nodeData = originData.map((d, i) => {
            let targetItem = originData.find(item => item.OutAccountNumber === d.InAccountNumber);
            if (targetItem) {
                if (d.AmountDeposit > 0) {
                    linkData.push({
                        source: d.id,
                        target: targetItem.id,
                        type: '입금',
                        account: d.AmountDeposit + ''
                    });
                } else {
                    linkData.push({
                        source: d.id,
                        target: targetItem.id,
                        type: '출금',
                        account: d.AmountPaid + ''
                    });
                }
            }
            return d;
        });

        doc.d3ForceLayoutDragComponent.updateData(nodeData, linkData);
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

        this.dbClick = new Subject();

        const buff$ = this.dbClick.pipe(
            debounceTime(250),
        )

        const doublicClick$ = this.dbClick.pipe(
            buffer(buff$),
            map(list => {
                return list.length;
            }),
            filter(x => x === 2),
        );

        const oneClick$ = this.dbClick.pipe(
            buffer(buff$),
            map(list => {
                return list.length;
            }),
            filter(x => x === 1),
        );

        // double click event
        doublicClick$.subscribe(() => {
            console.log('doubleclick : ', this.currentNode);
        });

        // one click event
        oneClick$.subscribe(() => {
            console.log('one click : ', this.currentNode);
            this.drawAccountInformation(this.currentNode);
        });

        // select node and link
        this.selectedNode = null;
        this.selectedLink = null;

        //current node
        this.currentNode = null;

        // force layout
        this.simulation = null; 

        // zoom event variable
        this.zoomObj = null;

        // zoom event가 반영되어야 하는 target element
        this.zoomTarget = null;

        // transform 현상태를 저장 
        this.currentTransform = null;

        this.detailGroup = null;

        this.isDrag = false;

        // 시연 테스트를 위함 기준 거래자명
        this.compare = null;

        // 입출금 색상
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

        // 거래총액 1억이상 > 1억미만 > 5천만원 미만
        this.transactionAmountData = [
            {
                label: '거래총액 1억이상',
                radius: 32
            },
            {
                label: '1억미만',
                radius: 27
            },
            {
                label: '5천만원 미만',
                radius: 20
            }
        ];

        this.init();
        this.draw();
        // this.drawLegend();
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
            .attr('id', 'arrowEnd')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 16)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', this.accountInOutData[0].color)
                .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowStart')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', -6)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)    
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,0L10,-5L10,5')
                .attr('fill', this.accountInOutData[1].color)
                .style('stroke','none');

        // stroke width: 2
        defs.append('marker')
            .attr('id', 'arrowEnd-2')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', -1.5)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', this.accountInOutData[0].color)
                .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowStart-2')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', -5)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)    
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,0L10,-5L10,5')
                .attr('fill', this.accountInOutData[1].color)
                .style('stroke','none');

        // stroke width: 8
        defs.append('marker')
            .attr('id', 'arrowEnd-8')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 16)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', this.accountInOutData[0].color)
                .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowStart-8')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', -6)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)    
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,0L10,-5L10,5')
                .attr('fill', this.accountInOutData[1].color)
                .style('stroke','none');

        // stroke width: 16
        defs.append('marker')
            .attr('id', 'arrowEnd-16')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', this.accountInOutData[0].color)
                .style('stroke','none');

        defs.append('marker')
            .attr('id', 'arrowStart-16')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', -1)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)    
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,0L10,-5L10,5')
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

        // force link setup
        const forceLinkObj = forceLink().id((d) => {
            return d.id;
        }).iterations(5).distance(200).strength(1);

        // force layout setup
        this.simulation = forceSimulation()
            .force('link', forceLinkObj)
            .force('box', () => {
                for (let i = 0, n = this.nodeData.length; i < n; ++i) {
                    const curr_node = this.nodeData[i];
                    curr_node.x = Math.max(radius, Math.min(this.svgWidth - radius, curr_node.x));
                    curr_node.y = Math.max(radius, Math.min(this.svgHeight - radius, curr_node.y));
                }
            })
            .force('charge', forceManyBody().strength(-200))
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

        // 바깥쪽 더블클릭 방지.
        this.svg.call(
            this.zoomObj
        ).on('dblclick.zoom', null);

        // 도형 group
        this.zoomTarget = this.svg.append('g').attr('class', 'main-group');

        // detail group
        this.detailGroup = this.svg.append('g')
            .attr('class', 'detail-group')
            .attr('filter', 'url(#dropshadow)');

        // resize handler
        const resizeEvent = fromEvent(window, 'resize').pipe(debounceTime(500));
        resizeEvent.subscribe(() => {
            if (!this.svg) return;

            this.svgWidth = parseInt(this.svg.style('width'));
            this.svgHeight = parseInt(this.svg.style('height'));

            this.detailGroup.attr('transform', `translate(${this.svgWidth - 250}, 0)`);
        });
    }

    draw() {
        this.simulation.alphaTarget(0.3).restart();
        // this.simulation.stop();
        // while (this.simulation.alpha() > this.simulation.alphaMin()) {
        //     this.simulation.tick();
        // }
        // this.simulation.alphaTarget(0.3).restart();
        // TODO: 선택한 데이터가 없기 때문에 첫번째 데이터를 기준점으로 셋팅. 우선 테스트를 위함. 
        this.update(this.nodeData, this.linkData);
    }

    // node list만으로 링크정보를 생성하는 메서드
    updateOnlyNode(nodes) {
        this.nodeData = nodes;
        const links = [];
        this.nodeData.map((d, i) => {
            d.id = i;
        });
        this.nodeData.map((d, i) => {
            let targetItem = this.nodeData.find(item => item.OutAccountNumber === d.InAccountNumber);
            if (targetItem) {
                if (d.AmountDeposit > 0) {
                    links.push({
                        source: d.id,
                        target: targetItem.id,
                        type: '입금',
                        account: d.AmountDeposit + ''
                    });
                } else {
                    links.push({
                        source: d.id,
                        target: targetItem.id,
                        type: '출금',
                        account: d.AmountPaid + ''
                    });
                }
            }
            return d;
        });
        this.linkData = links;
        this.zoomTarget.remove();
        this.detailGroup.selectAll('*').remove();
        this.zoomTarget = this.svg.append('g').attr('class', 'main-group');
        // this.simulation.alphaTarget(0.3).restart();
        this.update(this.nodeData, this.linkData);
        setTimeout(() => {
            this.svg.node().appendChild(this.detailGroup.node());
        }, 500);
    }

    addData(nodes) {
        this.simulation.alphaTarget(0.3).restart();
        this.nodeData = this.nodeData.concat(nodes);
        console.log('addData : ', this.nodeData, nodes);
        this.updateOnlyNode(this.nodeData);
    }

    updateData(nodes, links, compare) {
        this.compare = compare
        this.nodeData = nodes;
        this.linkData = links;
        this.zoomTarget.remove();
        this.detailGroup.selectAll('*').remove();
        this.zoomTarget = this.svg.append('g').attr('class', 'main-group');
        // this.simulation.alphaTarget(0.3).restart();
        this.update(nodes, links);
        setTimeout(() => {
            this.svg.node().appendChild(this.detailGroup.node());
        }, 500);
        
    }

    update(nodes, links) {
        nodes.map(d => {
            if (!d.TransactionCount) {
                d.TransactionCount = nodes.filter(item => item.OutAccountNumber === d.OutAccountNumber || item.InAccountNumber === d.OutAccountNumber).length;
            }
        });
        const radius = 20;

        this.link = this.zoomTarget.selectAll('.link')
            .data(links)
            .join(
                (enter) => enter.append('line').attr('class', 'link'),
                (update) => update,
                (exit) => exit.remove()
            )
            // .attr('marker-end','url(#arrowhead)')
            .attr('marker-start', (d) => {
                const source = this.nodeData.find((item) => item.id === d.source);
                let transactionCount = 2;
                // TODO: 5회이상 > 5회미만 > 1회
                if (source.TransactionCount > 5) {
                    transactionCount = 16;
                } else if (source.TransactionCount < 5) {
                    transactionCount = 8;
                } else if (source.TransactionCount === 1) {
                    transactionCount = 2;
                }
                let returnValue = '';
                if (d.type === '출금') {
                    returnValue = `url(#arrowStart-${transactionCount})`;
                }
                return returnValue;
            })
            .attr('marker-end', (d) => {
                const source = this.nodeData.find((item) => item.id === d.source);
                let transactionCount = 2;
                // TODO: 5회이상 > 5회미만 > 1회
                if (source.TransactionCount > 5) {
                    transactionCount = 16;
                } else if (source.TransactionCount < 5) {
                    transactionCount = 8;
                } else if (source.TransactionCount === 1) {
                    transactionCount = 2;
                }
                let returnValue = '';
                if (d.type === '입금') {
                    returnValue = `url(#arrowEnd-${transactionCount})`;
                }
                return returnValue;
            })
            .style('stroke', (d) => {
                let color = this.accountInOutData.find((item) => item.label === d.type).color;
                return color;
            })
            .style('stroke-width', (d) => {
                const source = this.nodeData.find((item) => item.id === d.source);
                let returnValue = 2;
                // TODO: 5회이상 > 5회미만 > 1회
                if (source && source.TransactionCount > 5) {
                    returnValue = 16;
                } else if (source && source.TransactionCount < 5) {
                    returnValue = 8;
                } else if (source && source.TransactionCount === 1) {
                    returnValue = 2;
                } 

                return returnValue;
            });
            
        // this.link.append('title')
        //     .text((d) => {
        //         return d.type;
        //     });

        this.edgepaths = this.zoomTarget.selectAll('.edgepath')
            .data(links)
            .join(
                (enter) => enter.append('path').attr('class', 'edgepath'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', (d, i) => {
                return 'edgepath' + i;
            })
            .style('pointer-events', 'none');

        this.edgelabels = this.zoomTarget.selectAll('.edgelabel')
            .data(links)
            .join(
                (enter) => enter.append('text').attr('class', 'edgelabel'),
                (update) => update.selectAll('textPath').remove(),
                (exit) => exit.remove()
            )
            .style('pointer-events', 'none')
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
            });

        this.node = this.zoomTarget.selectAll('.node')
            .data(nodes)
            .join(
                (enter) => enter.append('g').attr('class', 'node'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('filter', 'url(#dropshadow)')
            .call(drag()
                    .on('start', (d) => {
                        this.detailGroup.selectAll('*').remove();

                        d.fx = d.x;
                        d.fy = d.y;
                        d.fixed = true;

                        this.selectedLink = this.link.filter((link) => {
                            return link.source.id === d.id || link.target.id === d.id;
                        });
                
                        this.selectedNode = this.node.filter((node) => node.id === d.id);
                    })
                    .on('drag', (d) => {
                        d.x = d.fx = Math.max(radius, Math.min(this.svgWidth - radius, event.x));
                        d.y = d.fy = Math.max(radius, Math.min(this.svgHeight - radius, event.y)); 
                        this.oneTicked();
                    })
                    .on('end', () => {
                        this.isDrag = false;
                        this.selectedLink = null;
                        this.selectedNode = null;
                    })
            )
            .on('click', (d) => {
                event.preventDefault();
                event.stopPropagation();
                this.currentNode = d;
                this.dbClick.next(d);
            });

        this.node.selectAll('circle')
            .data((d) => [d])
            .join(
                (enter) => enter.append('circle'),
                (update) => update.selectAll('text').remove(),
                (exit) => exit.remove()
            )
            .attr('r', (d) => {
                // TODO: 거래총액 1억이상 > 1억미만 > 5천만원 미만
                let returnValue = radius;
                const transactionAccount = parseInt(d.AmountPaid) + parseInt(d.AmountDeposit);
                if (transactionAccount >= 100000000) {
                    returnValue += 12;
                } else if (transactionAccount < 50000000) {
                    
                } else if (transactionAccount < 100000000) {
                    returnValue += 6;
                }
                return returnValue;
            })
            .style('stroke', '#fff')
            .style('stroke-width', 2)
            .style('fill', (d, i) => {
                let color = '#68a1fc';
                return color;
            });

        // this.node.append('title')
        //     .text((d) => {
        //         return d.id;
        //     });

        this.node.append('text')
            .attr('dy', () => {
                return 5;
            })
            .style('font-size', 'small')
            .style('stroke', (d, i) => {
                let color = '#000';
                return color;
            })
            .text((d) => {
                return d.Name;
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

         // 1회용 observable
         const initialExcuteObserv = Observable.create((observer) => {
            observer.next();
            observer.complete();
        });

        initialExcuteObserv.pipe(
            delay(2000)
        ).subscribe(() => {
            this.simulation.stop();
        });
    }

    drawAccountInformation(infoData) {
        const boxHeight = 260;
        const boxWidth = 250;
        this.detailGroup.attr('transform', `translate(${this.svgWidth - boxWidth}, 0)`);
        const background = this.detailGroup.selectAll('.detail-background')
            .data(['rect'])
            .join(
                (enter) => enter.append('rect').attr('class', 'detail-background'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('width', boxWidth)
            .attr('height', boxHeight)
            .style('fill', '#bababa')
            .style('stroke', '#000')
            .style('stroke-width', 2);
        // Name,NameNo,Bank,OutAccountNumber,InAccountNumber,TransactionDate,TransactionTime,TransactionType,TransactionChannel,TransactionMeans,Briefs,CurrencySeparation,ForeignCurrencyTransactionAmt,AmountPaid,AmountDeposit,Balance,FinancialInstitution,ShopName
        // 거래자명,실명번호,금융기관,계좌번호,거래일자,거래시각,거래종류명,거래수단명,거래채널명,적요,통화구분,잔액,취급금융기관,취급점명
        const labels = [
            {
                key: 'Name',
                label: '거래자명',
                value: infoData.Name
            },
            {
                key: 'NameNo',
                label: '실명번호',
                value: infoData.NameNo
            },
            {
                key: 'Bank',
                label: '금융기관',
                value: infoData.Bank
            },
            {
                key: 'OutAccountNumber',
                label: '계좌번호',
                value: infoData.OutAccountNumber
            },
            // {
            //     key: 'TransactionDate',
            //     label: '거래일자',
            //     value: infoData.TransactionDate
            // },
            // {
            //     key: 'TransactionTime',
            //     label: '거래시각',
            //     value: infoData.TransactionTime
            // },
            {
                key: 'TransactionType',
                label: '거래종류명',
                value: infoData.TransactionType
            },
            {
                key: 'TransactionChannel',
                label: '거래수단명',
                value: infoData.TransactionChannel
            },
            {
                key: 'TransactionMeans',
                label: '거래채널명',
                value: infoData.TransactionMeans
            },
            {
                key: 'Briefs',
                label: '적요',
                value: infoData.Briefs
            },
            {
                key: 'CurrencySeparation',
                label: '통화구분',
                value: infoData.CurrencySeparation
            },
            {
                key: 'Balance',
                label: '잔액',
                value: this.numberFmt(infoData.Balance)
            },
            {
                key: 'FinancialInstitution',
                label: '취급금융기관',
                value: infoData.FinancialInstitution
            },
            {
                key: 'ShopName',
                label: '취급점명',
                value: infoData.ShopName
            }
        ];

        const labelelements = this.detailGroup.selectAll('.detail-label')
            .data(labels)
            .join(
                (enter) => enter.append('text').attr('class', 'detail-label'),
                (update) => update,
                (exit) => exit.remove()
            )
            .attr('x', 100)
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
            .attr('x', 110)
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
    }

    drawDetailInfo(d) {
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
            .attr('y', () => {
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
                let returnValue = d.type;
                // if (this.compare && (d.source.id === this.compare.id)) {
                    
                // } else {
                //     if (d.type === '입금') {
                //         returnValue = '출금';
                //     } else {
                //         returnValue = '입금'
                //     }
                // }
                // console.log('returnValue : ', this.compare, d);
                return returnValue;
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
    }

    oneTicked() {
        if (this.selectedLink) {
            this.selectedLink
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
        }

        if (this.selectedNode) {
            this.selectedNode.attr('transform', (d) => {
                return 'translate(' + d.x + ', ' +  d.y + ')';
            });
        }

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