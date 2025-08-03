// Data Mapping for Social Media Posts Classification
// Converts ABCD codes to real meanings

const DataMapping = {
    // 1. 事件主体 [单选]
    eventSubject: {
        'A': '政府与公共机构',
        'B': '企业与商业组织',
        'C': '社会名人与公众人物',
        'D': '普通民众个体或群体',
        'E': '非营利组织或社会团体'
    },

    // 2. 事件性质 [单选]
    eventNature: {
        'A': '时事政治热点',
        'B': '重大公共安全事件',
        'C': '公权力领域负面事件',
        'D': '社会经济热点事件',
        'E': '企业违法违规行为',
        'F': '民生领域突出问题',
        'G': '价值观念偏差问题'
    },

    // 3. 事件范围 [多选]
    eventScope: {
        'A': '时间：近期/今日/具体日期/无',
        'B': '地点：本市/全国/全球/无'
    },

    // 4. 帖文立场 [单选]
    postPosition: {
        'A': '批判质疑',
        'B': '支持赞同',
        'C': '客观陈述',
        'D': '求助呼吁',
        'E': '调侃戏谑',
        'F': '疑问探究'
    },

    // 5. 信息类型 [单选]
    infoType: {
        'A': '事实陈述与爆料',
        'B': '个人观点与评论',
        'C': '谣言与不实信息',
        'D': '官方通报与澄清',
        'E': '情感宣泄与表达'
    },

    // 6. 情绪类型 [单选]
    emotionType: {
        'F1': '中性',
        'F2': '喜悦',
        'F3': '愤怒',
        'F4': '悲伤',
        'F5': '惊奇',
        'F6': '恐惧'
    },

    // 平台映射
    platformMapping: {
        'DY': '抖音',
        'XHS': '小红书',
        'WYXW': '微信官方账号',
        'JRTT': '今日头条',
        'VX': '微信'
    },

    // 信息属性映射
    infoAttribute: {
        '敏感': '敏感信息',
        '非敏感': '非敏感信息',
        '中性': '中性信息'
    }
};

// 转换函数
class DataConverter {
    constructor() {
        this.mapping = DataMapping;
    }

    // 转换单个字段
    convertField(fieldName, value) {
        const mapping = this.mapping[fieldName];
        if (!mapping) {
            return value;
        }

        if (Array.isArray(value)) {
            // 处理多选字段（如事件范围）
            return value.map(v => mapping[v] || v);
        } else {
            // 处理单选字段
            return mapping[value] || value;
        }
    }

    // 转换整个帖子对象
    convertPost(post) {
        const converted = { ...post };
        
        // 转换各个字段
        converted.事件主体 = this.convertField('eventSubject', post.事件主体);
        converted.事件性质 = this.convertField('eventNature', post.事件性质);
        converted.事件范围 = this.convertField('eventScope', post.事件范围);
        converted.帖文立场 = this.convertField('postPosition', post.帖文立场);
        converted.信息类型 = this.convertField('infoType', post.信息类型);
        converted.情绪类型 = this.convertField('emotionType', post.情绪类型);
        converted.平台 = this.convertField('platformMapping', post.平台);
        converted.信息属性 = this.convertField('infoAttribute', post.信息属性);

        return converted;
    }

    // 转换整个数据集
    convertDataset(posts) {
        return posts.map(post => this.convertPost(post));
    }

    // 获取分类统计
    getCategoryStats(posts) {
        const stats = {
            eventSubject: {},
            eventNature: {},
            eventScope: {},
            postPosition: {},
            infoType: {},
            emotionType: {},
            platform: {},
            infoAttribute: {}
        };

        posts.forEach(post => {
            // 统计事件主体
            const subject = post.事件主体;
            stats.eventSubject[subject] = (stats.eventSubject[subject] || 0) + 1;

            // 统计事件性质
            const nature = post.事件性质;
            stats.eventNature[nature] = (stats.eventNature[nature] || 0) + 1;

            // 统计事件范围（多选）
            if (Array.isArray(post.事件范围)) {
                post.事件范围.forEach(scope => {
                    stats.eventScope[scope] = (stats.eventScope[scope] || 0) + 1;
                });
            }

            // 统计帖文立场
            const position = post.帖文立场;
            stats.postPosition[position] = (stats.postPosition[position] || 0) + 1;

            // 统计信息类型
            const infoType = post.信息类型;
            stats.infoType[infoType] = (stats.infoType[infoType] || 0) + 1;

            // 统计情绪类型
            const emotion = post.情绪类型;
            stats.emotionType[emotion] = (stats.emotionType[emotion] || 0) + 1;

            // 统计平台
            const platform = post.平台;
            stats.platform[platform] = (stats.platform[platform] || 0) + 1;

            // 统计信息属性
            const attribute = post.信息属性;
            stats.infoAttribute[attribute] = (stats.infoAttribute[attribute] || 0) + 1;
        });

        return stats;
    }

    // 生成定性结果
    generateQualitativeResult(post) {
        const subject = this.mapping.eventSubject[post.事件主体] || post.事件主体;
        const nature = this.mapping.eventNature[post.事件性质] || post.事件性质;
        
        // 简化的定性结果生成
        const subjectShort = {
            'A': '政府',
            'B': '企业',
            'C': '名人',
            'D': '民众',
            'E': '组织'
        }[post.事件主体] || '主体';

        const natureShort = {
            'A': '发布政策',
            'B': '发生事故',
            'C': '涉嫌违规',
            'D': '开展活动',
            'E': '违规经营',
            'F': '存在问题',
            'G': '行为不当'
        }[post.事件性质] || '进行活动';

        return `${subjectShort}${natureShort}`;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataMapping, DataConverter };
} else {
    window.DataMapping = DataMapping;
    window.DataConverter = DataConverter;
} 