class SocialMediaVisualization {
    constructor() {
        this.data = null;
        this.postsData = null;
        this.simulation = null;
        this.currentTime = 0;
        this.selectedPlatform = '全部';
        this.selectedTopic = null; // 新增：选中的topic
        this.timeRange = { start: 0, end: 100 };
        this.visibleNodes = new Set();
        this.visibleLinks = new Set();
        this.draggable = false; // Control whether nodes can be dragged
        
        // Initialize data converter with safety check
        try {
            this.dataConverter = new DataConverter();
        } catch (error) {
            console.error('Failed to initialize DataConverter:', error);
            this.dataConverter = null;
        }
        
        this.platformColors = {
            'DY': '#AC6158',
            'XHS': '#3E5555',
            'WYXW': '#C3AB32',
            'JRTT': '#AD748C',
            'VX': '#E17D66',
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
        console.log('Initializing SocialMediaVisualization...');
        await this.loadData();
        console.log('Data loaded, setting up event listeners...');
        this.setupEventListeners();
        console.log('Creating main visualization...');
        this.createMainVisualization();
        console.log('Creating auxiliary charts...');
        this.createAuxiliaryCharts();
        
        // Initial update
        console.log('Updating visualization...');
        this.updateVisualization();
        this.updateAuxiliaryCharts();
        this.updateDebugInfo();
        console.log('Initialization complete');
    }
    
    async loadData() {
        console.log('Loading data files...');
        try {
            const [pathsResponse, postsResponse, usersResponse] = await Promise.all([
                fetch('data/4-1data/paths_data.json'),
                fetch('data/4-1data/post.json'),
                fetch('data/4-1data/user.csv')
            ]);
            
            if (!pathsResponse.ok || !postsResponse.ok || !usersResponse.ok) {
                throw new Error('Failed to load data files');
            }
            
            this.data = await pathsResponse.json();
            this.postsData = await postsResponse.json();
            
            // Parse CSV data
            const csvText = await usersResponse.text();
            this.usersData = this.parseCSV(csvText);
            
            // Convert the posts data to readable format
            if (this.dataConverter) {
                this.convertedPostsData = this.dataConverter.convertDataset(this.postsData);
            } else {
                console.warn('DataConverter not available, using original data');
                this.convertedPostsData = this.postsData;
            }
            
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
            
            // Debug: Log data loading information
            console.log('Data Loading Debug:', {
                topicsCount: this.data.length,
                postsCount: this.postsData.length,
                convertedPostsCount: this.convertedPostsData.length,
                totalUsers: this.usersData.length,
                usersMapSize: this.usersMap.size,
                postsMapSize: this.postsMap.size,
                convertedPostsMapSize: this.convertedPostsMap.size
            });
            
            this.processData();
        } catch (error) {
            console.error('Error loading data:', error);
            // Set default values to prevent further errors
            this.data = [];
            this.postsData = [];
            this.usersData = [];
            this.convertedPostsData = [];
            this.postsMap = new Map();
            this.convertedPostsMap = new Map();
            this.usersMap = new Map();
            this.allPosts = [];
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
        
        if (!this.data || this.data.length === 0) {
            console.warn('No data to process');
            return;
        }
        
        this.data.forEach(topic => {
            const topicId = topic.话题编号;
            const posts = topic.路径.map((post, index) => {
                const postData = this.postsMap.get(post.帖文ID);
                return {
                    ...post,
                    topicId,
                    index,
                    timestamp: new Date(post.时间).getTime(),
                    propagationEffect: postData?.传播效果 || 1,
                    用户ID: postData?.用户ID || null  // Add user ID from posts data
                };
            });
            
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
        if (this.allPosts.length > 0) {
            const timestamps = this.allPosts.map(p => p.timestamp);
            this.timeRange.start = Math.min(...timestamps);
            this.timeRange.end = Math.max(...timestamps);
            
            console.log('Processed Data Debug:', {
                totalPosts: this.allPosts.length,
                timeRange: {
                    start: new Date(this.timeRange.start).toLocaleString(),
                    end: new Date(this.timeRange.end).toLocaleString()
                },
                topicsCount: this.timelineData.length
            });
        } else {
            this.timeRange.start = 0;
            this.timeRange.end = 100;
            console.warn('No posts data available');
        }
    }
    
    setupEventListeners() {
        // Add click to enable dragging
        document.addEventListener('click', (e) => {
            if (e.target.id === 'main-visualization' || e.target.tagName === 'svg') {
                this.draggable = !this.draggable;
                this.updateDragBehavior();
                console.log('Dragging enabled:', this.draggable);
            }
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Clear topic selection with Escape key
                this.selectedTopic = null;
                this.selectedPlatform = '全部'; // Also clear platform selection
                this.clearHighlights(); // Clear all chart highlights
                        this.updateVisualization();
        this.updateAuxiliaryCharts();
                console.log('Topic and platform selection cleared');
            }
        });
    }
    
    createMainVisualization() {
        const container = document.getElementById('main-visualization');
        
        // Ensure container has proper dimensions
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            console.warn('Container has zero dimensions, setting default size');
            container.style.width = '800px';
            container.style.height = '600px';
        }
        
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        console.log('Creating main visualization with dimensions:', { width, height });
        
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
        console.log('Updating visualization...');
        if (!this.allPosts || this.allPosts.length === 0) {
            console.warn('No posts data available for visualization');
            return;
        }
        
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        
        // Filter nodes and links based on current time
        const visiblePosts = this.allPosts.filter(post => {
            const timeVisible = post.timestamp <= currentTime;
            return timeVisible;
        });
        
        // Create nodes with preset positions
        const nodes = [];
        const links = [];
        
        // Group posts by platform
        const platformGroups = {};
        visiblePosts.forEach(post => {
            if (!platformGroups[post.平台]) {
                platformGroups[post.平台] = [];
            }
            platformGroups[post.平台].push(post);
        });
        
        // Create platform nodes as large circles
        const centerX = 400;
        const centerY = 300;
        const baseRadius = 180; // 缩小基础半径，让平台距离更近
        
        const platforms = Object.keys(platformGroups);
        platforms.forEach((platform, index) => {
            const platformPosts = platformGroups[platform];
            const totalEffect = platformPosts.reduce((sum, p) => sum + p.propagationEffect, 0);
            const radius = Math.max(40, Math.min(80, 30 + totalEffect * 1.5)); // 缩小平台圆圈大小
            
            // Position platforms in a circle pattern
            const angle = (index / platforms.length) * 2 * Math.PI;
            const distance = baseRadius;
            const platformX = centerX + Math.cos(angle) * distance;
            const platformY = centerY + Math.sin(angle) * distance;
            
            const platformNode = {
                id: `platform-${platform}`,
                type: 'platform',
                platform: platform,
                radius: radius,
                x: platformX,
                y: platformY,
                fx: platformX, // Fixed position
                fy: platformY
            };
            
            nodes.push(platformNode);
            
            // Add post nodes within platform with preset positions
            platformPosts.forEach((post, postIndex) => {
                const postRadius = Math.max(3, Math.min(8, 2 + post.propagationEffect * 1.2)); // 缩小帖子圆圈大小
                
                // Calculate position within platform circle in a spiral pattern
                const postAngle = (postIndex / platformPosts.length) * 2 * Math.PI;
                const postDistance = radius * 0.7; // Keep posts inside platform circle
                const postX = platformX + Math.cos(postAngle) * postDistance;
                const postY = platformY + Math.sin(postAngle) * postDistance;
                
                const postNode = {
                    id: post.帖文ID,
                    type: 'post',
                    topicId: post.topicId,
                    platform: post.平台,
                    radius: postRadius,
                    x: postX,
                    y: postY,
                    propagationEffect: post.propagationEffect,
                    timestamp: post.timestamp,
                    parentPlatform: platformNode,
                    fx: postX, // Fixed position
                    fy: postY
                };
                
                nodes.push(postNode);
            });
        });
        
        // Create links between topics (cross-platform connections)
        const topicGroups = {};
        visiblePosts.forEach(post => {
            if (!topicGroups[post.topicId]) {
                topicGroups[post.topicId] = [];
            }
            topicGroups[post.topicId].push(post);
        });
        
        // Create topic-to-topic links across platforms with progressive fading
        Object.values(topicGroups).forEach(topicPosts => {
            if (topicPosts.length > 1) {
                // Sort posts by timestamp within the topic
                topicPosts.sort((a, b) => a.timestamp - b.timestamp);
                
                // Create links between consecutive posts in the same topic
                for (let i = 1; i < topicPosts.length; i++) {
                    const sourcePost = topicPosts[i - 1];
                    const targetPost = topicPosts[i];
                    
                    const sourceNode = nodes.find(n => n.id === sourcePost.帖文ID);
                    const targetNode = nodes.find(n => n.id === targetPost.帖文ID);
                    
                    if (sourceNode && targetNode) {
                        // Calculate position in the topic sequence (0 to 1)
                        const positionInTopic = i / (topicPosts.length - 1);
                        
                        links.push({
                            source: sourcePost.帖文ID,
                            target: targetPost.帖文ID,
                            type: 'topic-sequence',
                            topicId: sourcePost.topicId,
                            sourceX: sourceNode.x,
                            sourceY: sourceNode.y,
                            targetX: targetNode.x,
                            targetY: targetNode.y,
                            positionInTopic: positionInTopic, // Store position for gradient calculation
                            linkIndex: i - 1 // Store link index within topic
                        });
                    }
                }
            }
        });
        
        // Remove old elements
        this.mainGroup.selectAll('.node').remove();
        this.mainGroup.selectAll('.link').remove();
        this.mainGroup.selectAll('.node-label').remove();
        this.mainGroup.selectAll('.platform-circle').remove();
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
            .attr('fill', '#E8D5C4');
        
        // Create gradient definitions for each topic with progressive fading
        const unifiedColor = '#E8D5C4'; // 统一使用深米色
        links.forEach((link, index) => {
            const gradientId = `gradient-${link.topicId}-${index}`;
            
            // Calculate gradient direction based on link direction
            const dx = link.targetX - link.sourceX;
            const dy = link.targetY - link.sourceY;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate opacity based on position in topic sequence
            const startOpacity = Math.max(0.9 - (link.positionInTopic * 0.6), 0.3);
            const endOpacity = Math.max(0.6 - (link.positionInTopic * 0.5), 0.1);
            
            const gradient = defs.append('linearGradient')
                .attr('id', gradientId)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', link.sourceX).attr('y1', link.sourceY)
                .attr('x2', link.targetX).attr('y2', link.targetY);
            
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', unifiedColor)
                .attr('stop-opacity', startOpacity);
            
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', unifiedColor)
                .attr('stop-opacity', endOpacity);
            
            // Store gradient ID in link data
            link.gradientId = gradientId;
        });
        
        // Create links first (behind platform circles)
        const link = this.mainGroup.selectAll('.link')
            .data(links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke', d => `url(#${d.gradientId})`)
            .style('stroke-width', 3)
            .style('opacity', 0.6) // 稍微提高透明度以显示渐变效果
            .style('stroke-linecap', 'round')
            .attr('marker-end', 'url(#arrow)');
        
        // Create platform circles (on top of links)
        const platformCircles = this.mainGroup.selectAll('.platform-circle')
            .data(nodes.filter(d => d.type === 'platform'))
            .enter().append('circle')
            .attr('class', 'platform-circle')
            .attr('r', d => d.radius)
            .style('fill', 'rgba(255, 255, 255, 0.1)')
            .style('stroke', d => this.platformColors[d.platform] || '#2c3e50')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '5,5');
        
        // Debug: Log link information
        console.log('Links created:', links.length);
        links.forEach((link, i) => {
            console.log(`Link ${i}: ${link.source} -> ${link.target} (Topic ${link.topicId})`);
            console.log(`  Positions: (${link.sourceX}, ${link.sourceY}) -> (${link.targetX}, ${link.targetY})`);
        });
        
        // Find the first post of selected topic for highlighting
        let firstPostOfSelectedTopic = null;
        if (this.selectedTopic !== null) {
            const topicPosts = this.allPosts.filter(p => p.topicId === this.selectedTopic);
            if (topicPosts.length > 0) {
                // Sort by timestamp and get the first one
                topicPosts.sort((a, b) => a.timestamp - b.timestamp);
                firstPostOfSelectedTopic = topicPosts[0].帖文ID;
            }
        }
        
        // Create nodes
        const node = this.mainGroup.selectAll('.node')
            .data(nodes)
            .enter().append('circle')
            .attr('class', d => `node ${d.type}`)
            .attr('r', d => d.radius)
            .style('fill', d => {
                if (d.type === 'platform') return 'rgba(255, 255, 255, 0.01)';
                
                // Keep original fill color for all posts
                return this.platformColors[d.platform] || '#ccc';
            })
            .style('stroke', d => {
                if (d.type === 'platform') return '#2c3e50';
                
                // Highlight first post of selected topic with border only
                if (this.selectedTopic !== null && d.id === firstPostOfSelectedTopic) {
                    return '#ff6b6b'; // Red stroke for first post
                }
                
                return 'white';
            })
            .style('stroke-width', d => {
                if (d.type === 'platform') return 1;
                
                // Highlight first post of selected topic
                if (this.selectedTopic !== null && d.id === firstPostOfSelectedTopic) {
                    return 2; // Thicker stroke for first post
                }
                
                return 1;
            })
            .style('opacity', d => {
                if (d.type === 'platform') return 0; // Make platform nodes transparent
                
                // Topic selection logic
                if (this.selectedTopic !== null) {
                    const postData = this.allPosts.find(p => p.帖文ID === d.id);
                    if (postData && postData.topicId === this.selectedTopic) {
                        return 1; // Highlight selected topic posts
                    } else {
                        return 0.1; // Dim other posts
                    }
                }
                
                // Platform filter logic
                if (this.selectedPlatform === '全部') return 1;
                return d.platform === this.selectedPlatform ? 1 : 0.3;
            });
        
        // Add labels
        const label = this.mainGroup.selectAll('.node-label')
            .data(nodes.filter(d => d.type === 'platform'))
            .enter().append('text')
            .attr('class', 'node-label platform-label')
            .text(d => d.platform)
            .style('font-size', '10px')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle');
        
        // Set initial positions
        platformCircles
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        // Set link positions
        link
            .attr('x1', d => d.sourceX)
            .attr('y1', d => d.sourceY)
            .attr('x2', d => d.targetX)
            .attr('y2', d => d.targetY)
            .style('opacity', d => {
                // Topic selection logic for links
                if (this.selectedTopic !== null) {
                    if (d.topicId === this.selectedTopic) {
                        return 0.9; // Highlight selected topic links
                    } else {
                        return 0.1; // Dim other links
                    }
                }
                
                // Platform filter logic for links
                if (this.selectedPlatform === '全部') return 0.6;
                
                // Check if both source and target posts match the selected platform
                const sourceNode = nodes.find(n => n.id === d.source);
                const targetNode = nodes.find(n => n.id === d.target);
                
                if (sourceNode && targetNode) {
                    const sourceMatch = sourceNode.platform === this.selectedPlatform;
                    const targetMatch = targetNode.platform === this.selectedPlatform;
                    return (sourceMatch && targetMatch) ? 0.6 : 0.15;
                }
                return 0.15;
            });
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        

        
        // Add click effects for posts
        node.filter(d => d.type === 'post').on('click', (event, d) => {
            // Only highlight categories in auxiliary charts, don't change main view state
            this.highlightPostCategories(d);
        });
        
        // Add click effects for links
        link.on('click', (event, d) => {
            this.selectTopic(d.topicId);
        })
        .style('cursor', 'pointer') // Add pointer cursor to indicate clickable
        .on('mouseover', function(event, d) {
            // Highlight the link on hover
            d3.select(this)
                .transition()
                .duration(200)
                .style('stroke-width', 5)
                .style('opacity', 1.0);
        })
        .on('mouseout', function(event, d) {
            // Restore original style
            d3.select(this)
                .transition()
                .duration(200)
                .style('stroke-width', 3);
        });
        
        // Store references for drag behavior
        this.nodes = node;
        this.links = link;
        this.labels = label;
        this.platformCircles = platformCircles;
        this.nodeData = nodes;
        
        this.updateDragBehavior();
    }
    
    selectPlatform(platform) {
        // Toggle platform selection
        if (this.selectedPlatform === platform) {
            this.selectedPlatform = '全部'; // Deselect if same platform clicked
        } else {
            this.selectedPlatform = platform; // Select new platform
        }
        
        // Clear highlights when changing platform selection
        this.clearHighlights();
        
        // Update visualization
        this.updateVisualization();
        this.updateAuxiliaryCharts();
        this.updateDebugInfo();
        
        console.log('Selected platform:', this.selectedPlatform);
    }
    
    selectTopic(topicId) {
        // Toggle topic selection
        if (this.selectedTopic === topicId) {
            this.selectedTopic = null; // Deselect if same topic clicked
        } else {
            this.selectedTopic = topicId; // Select new topic
        }
        
        // Clear highlights when changing topic selection
        this.clearHighlights();
        
        // Update visualization
        this.updateVisualization();
        this.updateAuxiliaryCharts();
        this.updateDebugInfo();
        
        console.log('Selected topic:', this.selectedTopic);
    }
    
    highlightPostCategories(postNode) {
        // Get the post data
        const postData = this.allPosts.find(p => p.帖文ID === postNode.id);
        if (!postData) {
            console.log('No post data found for node ID:', postNode.id);
            return;
        }
        
        // Get the converted post data for category information
        const convertedPost = this.convertedPostsMap.get(postNode.id);
        if (!convertedPost) {
            console.log('No converted post data found for node ID:', postNode.id);
            return;
        }
        
        // Create highlighting data object
        const highlightData = {
            platform: postData.平台, // Use platform from postData instead of convertedPost
            eventSubject: convertedPost.事件主体,
            eventNature: convertedPost.事件性质,
            postPosition: convertedPost.帖文立场,
            infoType: convertedPost.信息类型,
            emotion: convertedPost.情绪类型,
            userType: null,
            geographic: null
        };
        
        // Get user information if available
        const user = this.usersMap.get(postData.用户ID);
        if (user) {
            highlightData.userType = user.身份标签;
            highlightData.geographic = user.精准地域;
            console.log('User data found:', {
                userId: postData.用户ID,
                userType: user.身份标签,
                geographic: user.精准地域
            });
        } else {
            console.log('No user data found for user ID:', postData.用户ID);
        }
        
        console.log('Highlight data:', highlightData);
        
        // If a topic is currently selected, only highlight within that topic context
        if (this.selectedTopic !== null) {
            // Check if the clicked post belongs to the selected topic
            if (postData.topicId === this.selectedTopic) {
                // Highlight corresponding categories in all charts within the selected topic
                this.highlightCategoriesInCharts(highlightData);
            } else {
                console.log('Post not in selected topic. Post topic:', postData.topicId, 'Selected topic:', this.selectedTopic);
            }
        } else {
            // No topic selected, highlight normally
            this.highlightCategoriesInCharts(highlightData);
        }
    }
    
    highlightCategoriesInCharts(highlightData) {
        // Highlight in platform chart
        if (this.charts.platform && highlightData.platform) {
            this.charts.platform.highlightCategory(highlightData.platform);
        }
        
        // Highlight in content chart
        if (this.charts.content && highlightData.infoType) {
            this.charts.content.highlightCategory(highlightData.infoType);
        }
        
        // Highlight in event subjects chart
        if (this.charts.eventSubjects && highlightData.eventSubject) {
            this.charts.eventSubjects.highlightCategory(highlightData.eventSubject);
        }
        
        // Highlight in post positions chart
        if (this.charts.postPositions && highlightData.postPosition) {
            this.charts.postPositions.highlightCategory(highlightData.postPosition);
        }
        
        // Highlight in emotion types chart
        if (this.charts.emotionTypes && highlightData.emotion) {
            this.charts.emotionTypes.highlightCategory(highlightData.emotion);
        }
        
        // Highlight in user types chart
        if (this.charts.userTypes && highlightData.userType) {
            this.charts.userTypes.highlightCategory(highlightData.userType);
        }
        
        // Highlight in geographic chart
        if (this.charts.geographic && highlightData.geographic) {
            this.charts.geographic.highlightCategory(highlightData.geographic);
        }
    }
    
    clearHighlights() {
        // Clear highlights from all charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.clearHighlight === 'function') {
                chart.clearHighlight();
            }
        });
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
        
        this.platformCircles
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
    
    updateTimeFromChart(time) {
        this.currentTime = time;
        this.updateVisualization();
        this.updateAuxiliaryCharts();
        this.updateDebugInfo();
        
        // Sync the time trend chart's current time
        if (this.charts.timeTrend) {
            this.charts.timeTrend.setCurrentTime(time);
        }
    }
    
    createAuxiliaryCharts() {
        // Initialize all chart instances with safety checks
        const platformContainer = document.getElementById('platform-chart');
        const timeTrendContainer = document.getElementById('time-trend-chart');
        const contentContainer = document.getElementById('content-chart');
        const eventSubjectsContainer = document.getElementById('event-subjects-chart');
        const postPositionsContainer = document.getElementById('post-positions-chart');
        const emotionTypesContainer = document.getElementById('emotion-types-chart');
        const userTypesContainer = document.getElementById('user-types-chart');
        const geographicContainer = document.getElementById('geographic-chart');
        
        if (platformContainer) {
            this.charts.platform = new PlatformChart(
                platformContainer, 
                this.platformColors,
                (platform) => this.selectPlatform(platform)
            );
        }
        
        if (timeTrendContainer) {
            this.charts.timeTrend = new TimeTrendChart(
                timeTrendContainer,
                (time) => this.updateTimeFromChart(time)
            );
        }
        
        if (contentContainer) {
            this.charts.content = new ContentChart(contentContainer);
            this.charts.content.setConvertedPostsMap(this.convertedPostsMap);
        }
        
        if (eventSubjectsContainer) {
            this.charts.eventSubjects = new EventSubjectsChart(eventSubjectsContainer);
            this.charts.eventSubjects.setConvertedPostsMap(this.convertedPostsMap);
        }
        
        if (postPositionsContainer) {
            this.charts.postPositions = new PostPositionsChart(postPositionsContainer);
            this.charts.postPositions.setConvertedPostsMap(this.convertedPostsMap);
        }
        
        if (emotionTypesContainer) {
            this.charts.emotionTypes = new EmotionTypesChart(emotionTypesContainer);
            this.charts.emotionTypes.setConvertedPostsMap(this.convertedPostsMap);
        }
        
        if (userTypesContainer) {
            this.charts.userTypes = new UserTypesChart(userTypesContainer);
            this.charts.userTypes.setDataMaps(this.postsMap, this.usersMap);
        }
        
        if (geographicContainer) {
            this.charts.geographic = new GeographicChart(geographicContainer);
            this.charts.geographic.setDataMaps(this.postsMap, this.usersMap);
        }
    }
    
    updateAuxiliaryCharts() {
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        let visiblePosts = this.allPosts.filter(post => post.timestamp <= currentTime);
        
        // Filter by selected topic if any
        if (this.selectedTopic !== null) {
            visiblePosts = visiblePosts.filter(post => post.topicId === this.selectedTopic);
        }
        
        // Update all charts with safety checks
        if (this.charts.platform) {
            this.charts.platform.update(visiblePosts);
        }
        if (this.charts.timeTrend) {
            this.charts.timeTrend.update(this.allPosts); // Keep full timeline for context
        }
        if (this.charts.content) {
            this.charts.content.update(visiblePosts);
        }
        if (this.charts.eventSubjects) {
            this.charts.eventSubjects.update(visiblePosts);
        }
        if (this.charts.postPositions) {
            this.charts.postPositions.update(visiblePosts);
        }
        if (this.charts.emotionTypes) {
            this.charts.emotionTypes.update(visiblePosts);
        }
        if (this.charts.userTypes) {
            this.charts.userTypes.update(visiblePosts);
        }
        if (this.charts.geographic) {
            this.charts.geographic.update(visiblePosts);
        }
        
        // Update debug info when charts are updated
        this.updateDebugInfo();
    }
    
    updateDebugInfo() {
        const debugElement = document.getElementById('debug-info');
        const infoBox = document.querySelector('.info-box');
        
        if (!this.allPosts || this.allPosts.length === 0) {
            if (debugElement) debugElement.innerHTML = '<div>No data available</div>';
            if (infoBox) infoBox.innerHTML = '<div>No data available</div>';
            return;
        }
        
        const currentTime = this.timeRange.start + (this.timeRange.end - this.timeRange.start) * (this.currentTime / 100);
        const visiblePosts = this.allPosts.filter(post => post.timestamp <= currentTime);
        
        let matchedUsers = 0;
        const userTypes = {};
        const geographicDistribution = {};
        
        visiblePosts.forEach(post => {
            const user = this.usersMap.get(post.用户ID);
            if (user) {
                matchedUsers++;
                const userType = user.身份标签 || 'Unknown';
                const location = user.精准地域 || 'Unknown';
                userTypes[userType] = (userTypes[userType] || 0) + 1;
                geographicDistribution[location] = (geographicDistribution[location] || 0) + 1;
            }
        });
        
        const infoContent = `
            <div>• 总帖子数: ${this.allPosts.length}</div>
            <div>• 可见帖子数: ${visiblePosts.length}</div>
            <div>• 当前时间: ${new Date(currentTime).toLocaleDateString()}</div>
            <div>• 主题: ${this.selectedTopic !== null ? this.selectedTopic : '全部'}</div>
            <div>• 平台: ${this.selectedPlatform}</div>
        `;
        
        if (debugElement) debugElement.innerHTML = infoContent;
        if (infoBox) infoBox.innerHTML = infoContent;
    }
}

// Initialize the visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SocialMediaVisualization();
    
    // 全局清理tooltip的函数
    document.addEventListener('mouseleave', () => {
        d3.selectAll('.tooltip').remove();
    });
    
    // 点击其他地方时清理tooltip
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tooltip')) {
            d3.selectAll('.tooltip').remove();
        }
    });
});