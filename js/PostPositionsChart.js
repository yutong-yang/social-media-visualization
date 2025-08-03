class PostPositionsChart {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.convertedPostsMap = null;
        this.init();
    }
    
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
    }
    
    setConvertedPostsMap(convertedPostsMap) {
        this.convertedPostsMap = convertedPostsMap;
    }
    
    update(visiblePosts) {
        if (!this.convertedPostsMap) return;
        
        const postPositions = {};
        visiblePosts.forEach(post => {
            const convertedPost = this.convertedPostsMap.get(post.帖文ID);
            if (convertedPost) {
                const position = convertedPost.帖文立场 || 'Unknown';
                postPositions[position] = (postPositions[position] || 0) + 1;
            }
        });
        
        const data = Object.entries(postPositions).map(([position, count]) => ({
            position,
            count
        })).sort((a, b) => b.count - a.count); // Sort by count descending
        
        const width = this.svg.node().clientWidth;
        const height = this.svg.node().clientHeight;
        
        this.svg.selectAll('*').remove();
        
        if (data.length === 0) return;
        
        const margin = { top: 30, right: 20, bottom: 60, left: 80 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const x = d3.scaleBand()
            .domain(data.map(d => d.position))
            .range([0, chartWidth])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([chartHeight, 0]);
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Add title
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text('帖子立场');
        
        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y)
                .tickSize(-chartWidth)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
        
        // Add bars with gradient and animations
        const bars = g.selectAll('rect')
            .data(data)
            .enter().append('rect')
            .attr('x', d => x(d.position))
            .attr('y', chartHeight)
            .attr('width', x.bandwidth())
            .attr('height', 0)
            .style('fill', '#709AD2')
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip only, no color change
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '4px')
                    .style('font-size', '12px')
                    .style('pointer-events', 'none')
                    .style('z-index', '1000');
                
                tooltip.html(`
                    <strong>${d.position}</strong><br>
                    Count: ${d.count}
                `);
            })
            .on('mousemove', function(event) {
                const tooltip = d3.select('.tooltip');
                const tooltipNode = tooltip.node();
                const rect = tooltipNode.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                let left = event.pageX + 10;
                let top = event.pageY - 10;
                
                // 确保tooltip不会超出右边界
                if (left + rect.width > windowWidth) {
                    left = event.pageX - rect.width - 10;
                }
                
                // 确保tooltip不会超出下边界
                if (top + rect.height > windowHeight) {
                    top = event.pageY - rect.height - 10;
                }
                
                // 确保tooltip不会超出左边界
                if (left < 0) {
                    left = 10;
                }
                
                // 确保tooltip不会超出上边界
                if (top < 0) {
                    top = 10;
                }
                
                tooltip
                    .style('left', left + 'px')
                    .style('top', top + 'px');
            })
            .on('mouseout', function(d) {
                d3.select('.tooltip').remove();
            });
        

        
        // Set bar attributes directly without animation
        bars.attr('y', d => y(d.count))
            .attr('height', d => chartHeight - y(d.count));
        
        // Add value labels on bars
        g.selectAll('text.value')
            .data(data)
            .enter().append('text')
            .attr('class', 'value')
            .attr('x', d => x(d.position) + x.bandwidth() / 2)
            .attr('y', d => y(d.count) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text(d => d.count);
        
        // Add axes with better styling
        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y).ticks(5);
        
        g.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(xAxis)
            .style('font-size', '10px')
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');
        
        g.append('g')
            .call(yAxis)
            .style('font-size', '11px');
        
        // Add axis labels
        // g.append('text')
        //     .attr('x', chartWidth / 2)
        //     .attr('y', chartHeight + 50)
        //     .attr('text-anchor', 'middle')
        //     .style('font-size', '12px')
        //     .style('fill', '#2c3e50')
        //     .text('帖子立场');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#2c3e50')
            .text('帖子数量');
        
        // Store current data for highlighting
        this.currentData = data;
    }
    
    highlightCategory(position) {
        if (!this.currentData) return;
        
        // Reset all bars to normal opacity
        this.svg.selectAll('rect')
            .style('opacity', 0.3);
        
        // Highlight the selected position
        this.svg.selectAll('rect')
            .filter(d => d.position === position)
            .style('opacity', 1)
            .style('stroke', '#4a90e2')
            .style('stroke-width', 3);
    }
    
    clearHighlight() {
        // Reset all bars to normal state
        this.svg.selectAll('rect')
            .style('opacity', 1)
            .style('stroke', 'none');
    }
} 