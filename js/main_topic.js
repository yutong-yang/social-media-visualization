class SocialMediaVisualization {
    constructor() {
        this.data = null;
        this.postsData = null;
        this.simulation = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.selectedPlatform = 'all';
        this.timeRange = { start: 0, end: 100 };
        this.visibleNodes = new Set();
        this.visibleLinks = new Set();
        this.draggable = false; // Control whether nodes can be dragged
        this.dataConverter = new DataConverter(); // Initialize data converter
        
        this.platformColors = {
            'DY': '#ff6b6b',
            'XHS': '#4ecdc4',
            'WYXW': '#45b7d1',
            'JRTT': '#96ceb4',
            'VX': '#feca57',
            'P_0': '#4A90E2', // 微博蓝色
            'P_1': '#C3AB32', // 网易新闻黄色
            'P_2': '#AC6158', // 抖音红色
            'P_3': '#AD748C', // 今日头条紫色
            'P_4': '#3E5555', // 小红书深绿色
            'P_5': '#FF6B35', // 微信橙色
            '微博': '#4A90E2',
            '微信': '#FF6B35',
            '抖音': '#AC6158',
            '今日头条': '#AD748C',
            '小红书': '#3E5555',
            '网易新闻': '#C3AB32'
        };
        
        // Initialize chart instances
        this.charts = {};
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.createMainVisualization();
        this.createAuxiliaryCharts();
        this.startTimeline();
    }
    
    async loadData() {
        try {
            const [pathsResponse, postsResponse, usersResponse] = await Promise.all([
                fetch('data/4-1data/paths_data.json'),
                fetch('data/4-1data/posts.json'),
                fetch('data/4-1data/user.csv')
            ]);
            
            this.data = await pathsResponse.json();
            this.postsData = await postsResponse.json();
            
            // Parse CSV data
            const csvText = await usersResponse.text();
            this.usersData = this.parseCSV(csvText);
            
            // Convert the posts data to readable format
            this.convertedPostsData = this.dataConverter.convertDataset(this.postsData);
            
            // Create a map for quick post lookup
            this.postsMap = new Map();
            this.postsData.forEach(post => {
                this.postsMap.set(post.帖文ID, post);
            });
            
            // Create a map for converted posts
            this.convertedPostsMap = new Map();
            this.convertedPostsData.forEach(post => {
                this.convertedPostsMap.set(post.帖文ID, post);
            });
            
            // Create a map for user data
            this.usersMap = new Map();
            this.usersData.forEach(user => {
                this.usersMap.set(user.用户ID, user);
            });
            
            // Debug: Log user data loading information
            console.log('User Data Loading Debug:', {
                totalUsers: this.usersData.length,
                usersMapSize: this.usersMap.size
            });
            
            this.processData();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
        }
        
        return data;
    }
    
    processData() {
        // Process timeline data
        this.timelineData = [];
        this.allPosts = [];
        
        this.data.forEach(topic => {
            const topicId = topic.话题编号;
            const posts = topic.路径.map((post, index) => ({
                ...post,
                topicId,
                index,
                timestamp: new Date(post.时间).getTime(),
                propagationEffect: this.postsMap.get(post.帖文ID)?.传播效果 || 1
            }));
            
            this.allPosts.push(...posts);
            this.timelineData.push({
                topicId,
                posts,
                totalEffect: posts.reduce((sum, p) => sum + p.propagationEffect, 0)
            });
        });
        
        // Sort by timestamp
        this.allPosts.sort((a, b) => a.timestamp - b.timestamp);
        
        // Calculate time range
        const timestamps = this.allPosts.map(p => p.timestamp);
        this.timeRange.start = Math.min(...timestamps);
        this.timeRange.end = Math.max(...timestamps);
    }
    
    setupEventListeners() {
        // Platform filter
        document.getElementById('platform-select').addEventListener('change', (e) => {
            this.selectedPlatform = e.target.value;
            this.updateVisualization();
        });
        
        // Timeline controls
        document.getElementById('play-pause').addEventListener('click', () => {
            this.togglePlay();
        });
        
        document.getElementById('timeline-slider').addEventListener('input', (e) => {
            this.currentTime = parseInt(e.target.value);
            this.updateTimeline();
        });
        
        // Add click to enable dragging
        document.addEventListener('click', (e) => {
            if (e.target.id === 'main-visualization' || e.target.tagName === 'svg') {
                this.draggable = !this.draggable;
                this.updateDragBehavior();
                console.log('Dragging enabled:', this.draggable);
            }
        });
    }
    
    createMainVisualization() {
        const container = document.getElementById('main-visualization');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Create SVG
        this.svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.selectAll('g').attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Create main group
        this.mainGroup = this.svg.append('g');
        
        this.updateVisualization();
    }
    
    updateVisualization() {
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        
        // Filter nodes and links based on current time (show all posts, but dim unselected platforms)
        const visiblePosts = this.allPosts.filter(post => {
            const timeVisible = post.timestamp <= currentTime;
            return timeVisible;
        });
        
        // Create nodes with preset positions
        const nodes = [];
        const links = [];
        
        // Calculate topic positions in a beautiful layout
        const topicGroups = this.timelineData.filter(topic => {
            const topicPosts = visiblePosts.filter(p => p.topicId === topic.topicId);
            return topicPosts.length > 0;
        });
        
        // Create a more aesthetic layout - arrange topics in a flower-like pattern
        const centerX = 400;
        const centerY = 300;
        const baseRadius = 150;
        
        topicGroups.forEach((topic, index) => {
            const topicPosts = visiblePosts.filter(p => p.topicId === topic.topicId);
            const totalEffect = topicPosts.reduce((sum, p) => sum + p.propagationEffect, 0);
            const radius = Math.max(40, Math.min(100, 30 + totalEffect * 3));
            
            // Position topics in a flower pattern
            const angle = (index / topicGroups.length) * 2 * Math.PI;
            const distance = baseRadius + (index % 2) * 50; // Alternate between two rings
            const topicX = centerX + Math.cos(angle) * distance;
            const topicY = centerY + Math.sin(angle) * distance;
            
            const topicNode = {
                id: `topic-${topic.topicId}`,
                type: 'topic',
                topicId: topic.topicId,
                radius: radius,
                x: topicX,
                y: topicY,
                fx: topicX, // Fixed position
                fy: topicY
            };
            
            nodes.push(topicNode);
            
            // Add post nodes within topic with preset positions
            topicPosts.forEach((post, postIndex) => {
                const postRadius = Math.max(6, Math.min(15, 4 + post.propagationEffect * 2));
                
                // Calculate position within topic circle in a spiral pattern
                const postAngle = (postIndex / topicPosts.length) * 2 * Math.PI;
                const postDistance = radius * 0.6; // Keep posts inside topic circle
                const postX = topicX + Math.cos(postAngle) * postDistance;
                const postY = topicY + Math.sin(postAngle) * postDistance;
                
                const postNode = {
                    id: post.帖文ID,
                    type: 'post',
                    topicId: topic.topicId,
                    platform: post.平台,
                    radius: postRadius,
                    x: postX,
                    y: postY,
                    propagationEffect: post.propagationEffect,
                    timestamp: post.timestamp,
                    parentTopic: topicNode,
                    fx: postX, // Fixed position
                    fy: postY
                };
                
                nodes.push(postNode);
                
                // Create links between posts in sequence within the same topic
                if (postIndex > 0) {
                    const sourcePost = topicPosts[postIndex - 1];
                    const targetPost = post;
                    
                    // Calculate positions for source and target posts
                    const sourceAngle = ((postIndex - 1) / topicPosts.length) * 2 * Math.PI;
                    const targetAngle = (postIndex / topicPosts.length) * 2 * Math.PI;
                    const sourceDistance = radius * 0.6;
                    const targetDistance = radius * 0.6;
                    
                    const sourceX = topicX + Math.cos(sourceAngle) * sourceDistance;
                    const sourceY = topicY + Math.sin(sourceAngle) * sourceDistance;
                    const targetX = topicX + Math.cos(targetAngle) * targetDistance;
                    const targetY = topicY + Math.sin(targetAngle) * targetDistance;
                    
                    links.push({
                        source: sourcePost.帖文ID,
                        target: targetPost.帖文ID,
                        type: 'sequence',
                        topicId: topic.topicId,
                        sourceX: sourceX,
                        sourceY: sourceY,
                        targetX: targetX,
                        targetY: targetY
                    });
                }
            });
        });
        
        // Remove old elements
        this.mainGroup.selectAll('.node').remove();
        this.mainGroup.selectAll('.link').remove();
        this.mainGroup.selectAll('.node-label').remove();
        this.mainGroup.selectAll('.topic-circle').remove();
        this.mainGroup.selectAll('defs').remove();
        
        // Add arrow markers for direction (only once)
        const defs = this.svg.append('defs');
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#667eea');
        
        // Create topic circles (background)
        const topicCircles = this.mainGroup.selectAll('.topic-circle')
            .data(nodes.filter(d => d.type === 'topic'))
            .enter().append('circle')
            .attr('class', 'topic-circle')
            .attr('r', d => d.radius)
            .style('fill', 'rgba(255, 255, 255, 0.1)')
            .style('stroke', '#2c3e50')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,5');
        
        // Create links with different styles for different types
        const link = this.mainGroup.selectAll('.link')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke', d => {
                // Use different colors for different topics
                const topicColors = ['#667eea', '#feca57', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
                return topicColors[d.topicId % topicColors.length];
            })
            .style('stroke-width', 3)
            .style('opacity', 0.8)
            .style('stroke-linecap', 'round')
            .attr('marker-end', 'url(#arrow)');
        
        // Debug: Log link information
        console.log('Links created:', links.length);
        links.forEach((link, i) => {
            console.log(`Link ${i}: ${link.source} -> ${link.target} (Topic ${link.topicId})`);
            console.log(`  Positions: (${link.sourceX}, ${link.sourceY}) -> (${link.targetX}, ${link.targetY})`);
        });
        
        // Create nodes
        const node = this.mainGroup.selectAll('.node')
            .data(nodes)
            .enter().append('circle')
            .attr('class', d => `node ${d.type}`)
            .attr('r', d => d.radius)
            .style('fill', d => {
                if (d.type === 'topic') return 'rgba(255, 255, 255, 0.9)';
                return this.platformColors[d.platform] || '#ccc';
            })
            .style('stroke', d => d.type === 'topic' ? '#2c3e50' : 'white')
            .style('stroke-width', d => d.type === 'topic' ? 2 : 2)
            .style('opacity', d => {
                if (d.type === 'topic') return 1; // Topics are always visible
                // Dim posts that don't match the selected platform
                if (this.selectedPlatform === 'all') return 1;
                return d.platform === this.selectedPlatform ? 1 : 0.3;
            });
        
        // Add labels
        const label = this.mainGroup.selectAll('.node-label')
            .data(nodes.filter(d => d.type === 'topic'))
            .enter().append('text')
            .attr('class', 'node-label topic-label')
            .text(d => `Topic ${d.topicId}`)
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle');
        
        // Set initial positions
        topicCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        // Set link positions
        link
            .attr('x1', d => d.sourceX)
            .attr('y1', d => d.sourceY)
            .attr('x2', d => d.targetX)
            .attr('y2', d => d.targetY)
            .style('opacity', d => {
                // Dim links that don't match the selected platform
                if (this.selectedPlatform === 'all') return 0.8;
                
                // Check if both source and target posts match the selected platform
                const sourceNode = nodes.find(n => n.id === d.source);
                const targetNode = nodes.find(n => n.id === d.target);
                
                if (sourceNode && targetNode) {
                    const sourceMatch = sourceNode.platform === this.selectedPlatform;
                    const targetMatch = targetNode.platform === this.selectedPlatform;
                    return (sourceMatch && targetMatch) ? 0.8 : 0.2;
                }
                return 0.2;
            });
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        
        // Add hover effects
        node.on('mouseover', function(event, d) {
            d3.select(this).style('stroke-width', 4);
            if (d.type === 'post') {
                d3.select(this).style('opacity', 0.8);
            }
        }).on('mouseout', function(event, d) {
            d3.select(this).style('stroke-width', d.type === 'topic' ? 2 : 2);
            if (d.type === 'post') {
                // Restore opacity based on platform filter
                if (d.type === 'topic') {
                    d3.select(this).style('opacity', 1);
                } else {
                    if (this.selectedPlatform === 'all') {
                        d3.select(this).style('opacity', 1);
                    } else {
                        d3.select(this).style('opacity', d.platform === this.selectedPlatform ? 1 : 0.3);
                    }
                }
            }
        });
        
        // Add click effects for posts
        node.filter(d => d.type === 'post').on('click', (event, d) => {
            this.showPostDetails(d);
        });
        
        // Store references for drag behavior
        this.nodes = node;
        this.links = link;
        this.labels = label;
        this.topicCircles = topicCircles;
        this.nodeData = nodes;
        
        this.updateDragBehavior();
    }
    
    showPostDetails(post) {
        const convertedPost = this.convertedPostsMap.get(post.id);
        if (convertedPost) {
            const details = `
                <strong>Post Details:</strong><br>
                <strong>Platform:</strong> ${convertedPost.平台}<br>
                <strong>Event Subject:</strong> ${convertedPost.事件主体}<br>
                <strong>Event Nature:</strong> ${convertedPost.事件性质}<br>
                <strong>Post Position:</strong> ${convertedPost.帖文立场}<br>
                <strong>Info Type:</strong> ${convertedPost.信息类型}<br>
                <strong>Emotion:</strong> ${convertedPost.情绪类型}<br>
                <strong>Propagation Effect:</strong> ${post.propagationEffect.toFixed(2)}<br>
                <strong>Date:</strong> ${new Date(post.timestamp).toLocaleString()}
            `;
        }
    }
    
    updateDragBehavior() {
        if (this.draggable) {
            this.nodes.call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));
        } else {
            this.nodes.on('.drag', null);
        }
    }
    
    dragstarted(event, d) {
        if (!event.active) return;
        d.fx = d.x;
        d.fy = d.y;
    }
    
    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        
        // Update positions immediately
        this.nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        this.labels
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        
        this.topicCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        // Update links
        this.links
            .attr('x1', d => d.sourceX)
            .attr('y1', d => d.sourceY)
            .attr('x2', d => d.targetX)
            .attr('y2', d => d.targetY);
    }
    
    dragended(event, d) {
        if (!event.active) return;
        d.fx = null;
        d.fy = null;
    }
    
    startTimeline() {
        this.updateTimeline();
    }
    
    updateTimeline() {
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        const date = new Date(currentTime);
        document.getElementById('current-time').textContent = date.toLocaleDateString();
        
        this.updateVisualization();
        this.updateAuxiliaryCharts();
    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        const button = document.getElementById('play-pause');
        button.textContent = this.isPlaying ? 'Pause' : 'Play';
        
        if (this.isPlaying) {
            this.playAnimation();
        }
    }
    
    playAnimation() {
        if (!this.isPlaying) return;
        
        this.currentTime += 0.5;
        if (this.currentTime > 100) {
            this.currentTime = 0;
        }
        
        document.getElementById('timeline-slider').value = this.currentTime;
        this.updateTimeline();
        
        setTimeout(() => this.playAnimation(), 100);
    }
    
    createAuxiliaryCharts() {
        // Initialize all chart instances
        this.charts.platform = new PlatformChart(
            document.getElementById('platform-chart'), 
            this.platformColors
        );
        
        this.charts.timeTrend = new TimeTrendChart(
            document.getElementById('time-trend-chart')
        );
        
        this.charts.content = new ContentChart(
            document.getElementById('content-chart')
        );
        this.charts.content.setConvertedPostsMap(this.convertedPostsMap);
        
        this.charts.eventSubjects = new EventSubjectsChart(
            document.getElementById('event-subjects-chart')
        );
        this.charts.eventSubjects.setConvertedPostsMap(this.convertedPostsMap);
        
        this.charts.postPositions = new PostPositionsChart(
            document.getElementById('post-positions-chart')
        );
        this.charts.postPositions.setConvertedPostsMap(this.convertedPostsMap);
        
        this.charts.emotionTypes = new EmotionTypesChart(
            document.getElementById('emotion-types-chart')
        );
        this.charts.emotionTypes.setConvertedPostsMap(this.convertedPostsMap);
        
        this.charts.userTypes = new UserTypesChart(
            document.getElementById('user-types-chart')
        );
        this.charts.userTypes.setDataMaps(this.postsMap, this.usersMap);
        
        this.charts.geographic = new GeographicChart(
            document.getElementById('geographic-chart')
        );
        this.charts.geographic.setDataMaps(this.postsMap, this.usersMap);
    }
    
    updateAuxiliaryCharts() {
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        const visiblePosts = this.allPosts.filter(post => post.timestamp <= currentTime);
        
        // Update all charts
        this.charts.platform.update(visiblePosts);
        this.charts.timeTrend.update(this.allPosts);
        this.charts.content.update(visiblePosts);
        this.charts.eventSubjects.update(visiblePosts);
        this.charts.postPositions.update(visiblePosts);
        this.charts.emotionTypes.update(visiblePosts);
        this.charts.userTypes.update(visiblePosts);
        this.charts.geographic.update(visiblePosts);
    }
    

}

// Initialize the visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SocialMediaVisualization();
});