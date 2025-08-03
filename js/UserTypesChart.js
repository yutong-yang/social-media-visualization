class UserTypesChart {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.postsMap = null;
        this.usersMap = null;
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
    
    setDataMaps(postsMap, usersMap) {
        this.postsMap = postsMap;
        this.usersMap = usersMap;
    }
    
    update(visiblePosts) {
        if (!this.postsMap || !this.usersMap) return;
        
        const userTypes = {};
        let totalUsers = 0;
        let matchedUsers = 0;
        
        visiblePosts.forEach(post => {
            totalUsers++;
            
            // First, get the post details from posts.json using 帖文ID
            const postDetails = this.postsMap.get(post.帖文ID);
            if (postDetails && postDetails.用户ID) {
                // Then, get user details from user.csv using 用户ID
                const user = this.usersMap.get(postDetails.用户ID);
                
                if (user) {
                    matchedUsers++;
                    const userType = user.身份标签 || 'Unknown';
                    userTypes[userType] = (userTypes[userType] || 0) + 1;
                }
            }
        });
        
        // Debug information
        console.log('User Types Chart Debug:', {
            totalPosts: visiblePosts.length,
            totalUsers: totalUsers,
            matchedUsers: matchedUsers,
            userTypes: userTypes,
            usersMapSize: this.usersMap.size
        });
        
        const data = Object.entries(userTypes).map(([userType, count]) => ({
            userType,
            count
        })).sort((a, b) => b.count - a.count); // Sort by count descending
        
        const width = this.svg.node().clientWidth;
        const height = this.svg.node().clientHeight;
        
        this.svg.selectAll('*').remove();
        
        if (data.length === 0) {
            // Show message when no data
            const g = this.svg.append('g')
                .attr('transform', `translate(${width/2}, ${height/2})`);
            
            g.append('text')
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', '#666')
                .text('No user data available');
            return;
        }
        
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
            .text('用户类型');
        
        const path = g.selectAll('path')
            .data(pie(data))
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => i % 2 === 0 ? '#709AD2' : '#C6B79A')
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
                    <strong>${d.data.userType}</strong><br>
                    Users: ${d.data.count}<br>
                    Percentage: ${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%
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
            .text(d => d.data.userType);
        
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
    
    highlightCategory(userType) {
        if (!this.currentData) return;
        
        // Reset all paths to normal opacity
        this.svg.selectAll('path')
            .style('opacity', 0.3);
        
        // Highlight the selected user type
        this.svg.selectAll('path')
            .filter(d => d.data.userType === userType)
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