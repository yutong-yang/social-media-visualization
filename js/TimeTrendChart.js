class TimeTrendChart {
    constructor(container, onTimeUpdate) {
        this.container = container;
        this.onTimeUpdate = onTimeUpdate; // Callback for time updates
        this.svg = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.animationId = null; // Store animation frame ID
        this.lastUpdateTime = 0; // Track last update time for smooth animation
        this.init();
    }
    
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    update(allPosts) {
        const width = this.svg.node().clientWidth;
        const height = this.svg.node().clientHeight;
        
        this.svg.selectAll('*').remove();
        
        // Group posts by date
        const postsByDate = {};
        allPosts.forEach(post => {
            const date = new Date(post.timestamp).toDateString();
            if (!postsByDate[date]) postsByDate[date] = [];
            postsByDate[date].push(post);
        });
        
        // Create a complete date range with zero values for missing dates
        const dateRange = this.createCompleteDateRange(allPosts);
        const data = dateRange.map(date => {
            const dateStr = date.toDateString();
            const posts = postsByDate[dateStr] || [];
            return {
                date: date,
                count: posts.length,
                totalEffect: posts.reduce((sum, p) => sum + p.propagationEffect, 0)
            };
        });
        
        if (data.length === 0) return;
        
        const margin = { top: 5, right: 30, bottom: 110, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([chartHeight, 0]);
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Add title
        // g.append('text')
        //     .attr('x', chartWidth / 2)
        //     .attr('y', -10)
        //     .attr('text-anchor', 'middle')
        //     .style('font-size', '14px')
        //     .style('font-weight', 'bold')
        //     .style('fill', '#2c3e50')
        //     .text('时间趋势');
        
        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y)
                .tickSize(-chartWidth)
                .tickFormat('')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
        
        // Add line
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#A29C92')
            .attr('stroke-width', 1)
            .attr('d', line);
        
        // Add area under the line
        const area = d3.area()
            .x(d => x(d.date))
            .y0(chartHeight)
            .y1(d => y(d.count))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(data)
            .style('fill', '#A29C92')
            .style('opacity', 0.2)
            .attr('d', area);
        

        
        // Add dots with hover effects
        const dots = g.selectAll('circle')
            .data(data)
            .enter().append('circle')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.count))
            .attr('r', 2)
            .attr('fill', '#A29C92')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip only, no size change
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
                    <strong>${d.date.toLocaleDateString()}</strong><br>
                    Posts: ${d.count}<br>
                    Total Effect: ${d.totalEffect.toFixed(2)}
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
        
        // Add axes with better styling
        const xAxis = d3.axisBottom(x)
            .tickFormat(d3.timeFormat('%m/%d'))
            .ticks(6);
        const yAxis = d3.axisLeft(y)
            .ticks(5);
        
        g.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(xAxis)
            .style('font-size', '12px')
            .style('font-weight', '500');
        
        g.append('g')
            .call(yAxis)
            .style('font-size', '12px')
            .style('font-weight', '500');
        
        // Add axis labels
        // g.append('text')
        //     .attr('x', chartWidth / 2)
        //     .attr('y', chartHeight + 45)
        //     .attr('text-anchor', 'middle')
        //     .style('font-size', '13px')
        //     .style('font-weight', 'bold')
        //     .style('fill', '#2c3e50')
        //     .text('Date');
        
        // g.append('text')
        //     .attr('transform', 'rotate(-90)')
        //     .attr('x', -chartHeight / 2)
        //     .attr('y', -45)
        //     .attr('text-anchor', 'middle')
        //     .style('font-size', '13px')
        //     .style('font-weight', 'bold')
        //     .style('fill', '#2c3e50')
        //     .text('Post Count');
        
        // Add play control button
        const playButton = g.append('g')
            .attr('class', 'play-control')
            .attr('transform', `translate(${chartWidth - 60}, ${chartHeight + 30})`);
        
        playButton.append('rect')
            .attr('width', 50)
            .attr('height', 25)
            .attr('rx', 5)
            .attr('fill', '#666')
            .style('cursor', 'pointer')
            .style('transition', 'fill 0.2s')
            .on('click', () => this.togglePlay())
            .on('mouseover', function() {
                d3.select(this).attr('fill', '#8B8580');
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', '#A29C92');
            });
        
        playButton.append('text')
            .attr('x', 25)
            .attr('y', 17)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'white')
            .style('pointer-events', 'none')
            .text('播放');
        
        // Add keyboard shortcut hint
        g.append('text')
            .attr('x', chartWidth - 200)
            .attr('y', chartHeight + 45)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#666')
            .text('空格键: 播放/暂停 | ←→: 快退/快进');
        
        // Add time slider
        const timeSlider = g.append('g')
            .attr('class', 'time-slider')
            .attr('transform', `translate(0, ${chartHeight + 30})`);
        
        // Background track
        timeSlider.append('rect')
            .attr('width', chartWidth)
            .attr('height', 4)
            .attr('fill', '#ddd')
            .attr('rx', 2)
            .style('cursor', 'pointer')
            .on('click', (event) => {
                // Click anywhere on the track to jump to that time
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const newTime = Math.max(0, Math.min(100, (clickX / chartWidth) * 100));
                this.currentTime = newTime;
                this.stopAnimation();
                this.updateSlider();
                if (this.onTimeUpdate) {
                    this.onTimeUpdate(newTime);
                }
                const button = this.svg.select('.play-control text');
                button.text('播放');
            });
        
        // Progress bar
        timeSlider.append('rect')
            .attr('class', 'progress-bar')
            .attr('width', chartWidth * (this.currentTime / 100))
            .attr('height', 4)
            .attr('fill', '#A29C92')
            .attr('rx', 2);
        
        // Slider handle
        timeSlider.append('circle')
            .attr('class', 'slider-handle')
            .attr('cx', chartWidth * (this.currentTime / 100))
            .attr('cy', 2)
            .attr('r', 6)
            .attr('fill', '#A29C92')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', () => {
                    // Stop animation when user starts dragging
                    this.stopAnimation();
                    const button = this.svg.select('.play-control text');
                    button.text('播放');
                })
                .on('drag', (event) => {
                    const newTime = Math.max(0, Math.min(100, (event.x / chartWidth) * 100));
                    this.currentTime = newTime;
                    this.updateSlider();
                    if (this.onTimeUpdate) {
                        this.onTimeUpdate(newTime);
                    }
                }));
        

    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const button = this.svg.select('.play-control text');
        button.text(this.isPlaying ? '暂停' : '播放');
        
        if (this.isPlaying) {
            this.lastUpdateTime = 0; // Reset animation timing
            this.playAnimation();
        } else {
            // Stop animation
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }
    }
    
    playAnimation() {
        if (!this.isPlaying) return;
        
        const animate = (currentTime) => {
            if (!this.isPlaying) return;
            
            // Calculate delta time for smooth animation
            if (this.lastUpdateTime === 0) {
                this.lastUpdateTime = currentTime;
            }
            
            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;
            
            // Calculate time increment based on desired duration (30 seconds for full cycle)
            const targetDuration = 50000; // 30 seconds in milliseconds
            const increment = (deltaTime / targetDuration) * 100;
            
            this.currentTime += increment;
            if (this.currentTime > 100) {
                this.currentTime = 0;
            }
            
            this.updateSlider();
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.currentTime);
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    updateSlider() {
        const chartWidth = this.svg.node().clientWidth - 60;
        
        // Add smooth transitions for slider updates
        this.svg.select('.progress-bar')
            .transition()
            .duration(50) // Short duration for smooth updates
            .attr('width', chartWidth * (this.currentTime / 100));
            
        this.svg.select('.slider-handle')
            .transition()
            .duration(50) // Short duration for smooth updates
            .attr('cx', chartWidth * (this.currentTime / 100));
        

    }
    
    setCurrentTime(time) {
        this.currentTime = time;
        this.updateSlider();
    }
    
    stopAnimation() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.lastUpdateTime = 0;
    }
    
    formatTime(percentage) {
        // Convert percentage to time format (MM:SS)
        const totalSeconds = Math.floor((percentage / 100) * 600); // 10 minutes total
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when the chart container is focused or when no specific element is focused
            if (event.target === document.body || this.container.contains(event.target)) {
                switch (event.code) {
                    case 'Space':
                        event.preventDefault();
                        this.togglePlay();
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        this.currentTime = Math.max(0, this.currentTime - 5);
                        this.stopAnimation();
                        this.updateSlider();
                        if (this.onTimeUpdate) {
                            this.onTimeUpdate(this.currentTime);
                        }
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        this.currentTime = Math.min(100, this.currentTime + 5);
                        this.stopAnimation();
                        this.updateSlider();
                        if (this.onTimeUpdate) {
                            this.onTimeUpdate(this.currentTime);
                        }
                        break;
                }
            }
        });
    }
    
    createCompleteDateRange(allPosts) {
        if (allPosts.length === 0) return [];
        
        // Get the date range
        const timestamps = allPosts.map(post => post.timestamp);
        const startDate = new Date(Math.min(...timestamps));
        const endDate = new Date(Math.max(...timestamps));
        
        // Create array of all dates in range
        const dateRange = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dateRange;
    }
} 