class PlatformChart {
    constructor(container, platformColors, onPlatformSelect) {
        this.container = container;
        this.platformColors = platformColors;
        this.onPlatformSelect = onPlatformSelect; // Callback for platform selection
        this.svg = null;
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
    
    update(visiblePosts) {
        const platformCounts = {};
        visiblePosts.forEach(post => {
            platformCounts[post.平台] = (platformCounts[post.平台] || 0) + 1;
        });
        
        const data = Object.entries(platformCounts).map(([platform, count]) => ({
            platform,
            count,
            color: this.platformColors[platform]
        }));
        
        const width = this.svg.node().clientWidth;
        const height = this.svg.node().clientHeight;
        
        this.svg.selectAll('*').remove();
        
        if (data.length === 0) return;
        
        const radius = Math.min(width, height) / 2 - 30;
        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        const pie = d3.pie().value(d => d.count).sort(null);
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${width/2}, ${height/2})`);
        
        // Add title
        g.append('text')
            .attr('x', 0)
            .attr('y', -height/2 + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text('平台分布');
        
        const path = g.selectAll('path')
            .data(pie(data))
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white')
            .style('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip only, no scale change
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
                    <strong>${d.data.platform}</strong><br>
                    帖子数: ${d.data.count}<br>
                    百分比: ${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%
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
            .on('mouseout', function() {
                d3.select('.tooltip').remove();
            })
            .on('click', (event, d) => {
                // Call the callback to select platform
                if (this.onPlatformSelect) {
                    this.onPlatformSelect(d.data.platform);
                }
            });
        
        // Add labels with better positioning
        const label = g.selectAll('text.label')
            .data(pie(data))
            .enter().append('text')
            .attr('class', 'label')
            .attr('transform', d => {
                const pos = arc.centroid(d);
                const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                const x = pos[0] * 1.4;
                const y = pos[1] * 1.4;
                return `translate(${x}, ${y})`;
            })
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
            .text(d => d.data.platform);
        
        // Add count labels
        g.selectAll('text.count')
            .data(pie(data))
            .enter().append('text')
            .attr('class', 'count')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
            .text(d => d.data.count);
        
        // Store current data for highlighting
        this.currentData = data;
    }
    
    highlightCategory(platform) {
        if (!this.currentData) return;
        
        // Reset all paths to normal opacity
        this.svg.selectAll('path')
            .style('opacity', 0.3);
        
        // Highlight the selected platform
        this.svg.selectAll('path')
            .filter(d => d.data.platform === platform)
            .style('opacity', 1)
            .style('stroke-width', 4);
    }
    
    clearHighlight() {
        // Reset all paths to normal state
        this.svg.selectAll('path')
            .style('opacity', 1)
            .style('stroke-width', 2);
    }
}