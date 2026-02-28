import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import { ResumeBlock } from '../../../shared/types';

// Register NewComputerModern font (using a standard URL or system fallbacks for demo, but we should use a loaded font)
Font.register({
    family: 'NewComputerModern',
    fonts: [
        { 
            src: 'https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/cmunrm.ttf',
        },
        { 
            src: 'https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/cmunbx.ttf', 
            fontWeight: 'bold' 
        },
        { 
            src: 'https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/cmunti.ttf', 
            fontStyle: 'italic' 
        },
    ]
});

// Register a fallback standard serif font in case the above fails
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'NewComputerModern',
        fontSize: 11,
        color: '#000',
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
        color: '#003366',
    },
    contactInfo: {
        fontSize: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#003366',
        textTransform: 'uppercase',
        borderBottomWidth: 1,
        borderBottomColor: '#003366',
        paddingBottom: 2,
        marginBottom: 10,
    },
    item: {
        marginBottom: 10,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontWeight: 'bold',
    },
    itemSubheader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontStyle: 'italic',
        marginBottom: 5,
    },
    bulletList: {
        marginLeft: 10,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    bullet: {
        width: 10,
    },
    bulletText: {
        flex: 1,
    }
});

interface PdfDocumentProps {
    blocks: ResumeBlock[];
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({ blocks }) => {
    const header = blocks.find(b => b.type === 'header')?.data || {};
    const experiences = blocks.filter(b => b.type === 'experience').map(b => b.data);
    const education = blocks.filter(b => b.type === 'education').map(b => b.data);
    const projects = blocks.filter(b => b.type === 'project').map(b => b.data);
    const skills = blocks.filter(b => b.type === 'skills').map(b => b.data);

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.name}>{header.name || 'Your Name'}</Text>
                    <View style={styles.contactInfo}>
                        {header.location && <Text>{header.location}</Text>}
                        {header.phone && <Text>{header.phone}</Text>}
                        {header.email && <Link src={`mailto:${header.email}`}>{header.email}</Link>}
                        {header.website && <Link src={`https://${header.website.replace(/^https?:\/\//, '')}`}>{header.website}</Link>}
                        {header.linkedin && <Link src={`https://${header.linkedin.replace(/^https?:\/\//, '')}`}>LinkedIn</Link>}
                        {header.github && <Link src={`https://${header.github.replace(/^https?:\/\//, '')}`}>GitHub</Link>}
                    </View>
                </View>

                {/* Education */}
                {education.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Education</Text>
                        {education.map((edu, i) => (
                            <View key={i} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{edu.school || 'University'}</Text>
                                    <Text>{edu.year || 'Year'}</Text>
                                </View>
                                <View style={styles.itemSubheader}>
                                    <Text>{edu.degree || 'Degree'}</Text>
                                    <Text>{edu.location || 'Location'}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Experience */}
                {experiences.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Experience</Text>
                        {experiences.map((exp, i) => (
                            <View key={i} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{exp.company || 'Company'}</Text>
                                    <Text>{exp.duration || 'Duration'}</Text>
                                </View>
                                <View style={styles.itemSubheader}>
                                    <Text>{exp.role || 'Role'}</Text>
                                    <Text>{exp.location || 'Location'}</Text>
                                </View>
                                <View style={styles.bulletList}>
                                    {(exp.highlights || []).map((h: string, j: number) => (
                                        <View key={j} style={styles.bulletPoint}>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.bulletText}>{h}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Projects</Text>
                        {projects.map((proj, i) => (
                            <View key={i} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{proj.title || 'Project'} {(proj.technologies && proj.technologies.length > 0) ? ` | ${proj.technologies.join(', ')}` : ''}</Text>
                                    <Text>{proj.date}</Text>
                                </View>
                                <View style={styles.bulletList}>
                                    {(proj.highlights || []).map((h: string, j: number) => (
                                        <View key={j} style={styles.bulletPoint}>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.bulletText}>{h}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Technical Skills</Text>
                        <View style={styles.bulletList}>
                            {skills.map((s, i) => {
                                const points = (s.skills || '').split(';').map((p: string) => p.trim()).filter((p: string) => p);
                                return points.map((p: string, j: number) => {
                                    const [category, items] = p.split(':');
                                    return (
                                        <View key={`${i}-${j}`} style={styles.bulletPoint}>
                                            <Text style={styles.bullet}>•</Text>
                                            {items ? (
                                                <Text style={styles.bulletText}>
                                                    <Text style={{ fontWeight: 'bold' }}>{category}: </Text>
                                                    {items}
                                                </Text>
                                            ) : (
                                                <Text style={styles.bulletText}>{p}</Text>
                                            )}
                                        </View>
                                    );
                                });
                            })}
                        </View>
                    </View>
                )}
            </Page>
        </Document>
    );
};
