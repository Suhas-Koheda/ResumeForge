import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link, Font } from '@react-pdf/renderer';
import { ResumeBlock } from '../../../shared/types';

// Removed brittle Font.register for reliability. Using built-in PDF fonts.

// Using professional typography
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Times-Roman',
        fontSize: 11,
        color: '#000',
        lineHeight: 1.4,
    },
    header: {
        marginBottom: 15,
        textAlign: 'center',
    },
    name: {
        fontSize: 26,
        fontFamily: 'Times-Bold',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 1,
        color: '#000',
    },
    contactInfo: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
        color: '#000',
    },
    section: {
        marginTop: 15,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        color: '#000',
        textTransform: 'uppercase',
        borderBottomWidth: 1.5,
        borderBottomColor: '#000',
        paddingBottom: 2,
        marginBottom: 8,
        letterSpacing: 1,
    },
    item: {
        marginBottom: 10,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontFamily: 'Times-Bold',
        fontSize: 11.5,
        color: '#000',
    },
    itemSubheader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontFamily: 'Times-Italic' as any,
        fontSize: 10.5,
        color: '#111',
        marginBottom: 4,
    },
    bulletList: {
        marginLeft: 12,
        marginTop: 2,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 3,
        alignItems: 'flex-start',
    },
    bullet: {
        width: 12,
        fontFamily: 'Times-Bold',
        fontSize: 11,
        color: '#000',
    },
    bulletText: {
        flex: 1,
        fontFamily: 'Times-Roman',
        fontSize: 10.5,
        color: '#000',
    }
});

interface PdfDocumentProps {
    blocks: ResumeBlock[];
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({ blocks }) => {
    console.log("[LOG_RESUME_DOC] Rendering PDF blocks:", blocks.map(b => b.type));
    const header = blocks.find(b => b.type === 'header')?.data || {};
    const experiences = blocks.filter(b => b.type === 'experience').map(b => b.data);
    const education = blocks.filter(b => b.type === 'education').map(b => b.data);
    const projects = blocks.filter(b => b.type === 'project').map(b => b.data);
    const skills = blocks.filter(b => b.type === 'skills').map(b => b.data);

    console.log("[LOG_DATA_EXTRACT] Mapping complete:", {
        expCount: experiences.length,
        eduCount: education.length,
        projCount: projects.length,
        skillCount: skills.length
    });

    return (
        <Document title={`Resume - ${header.name || 'Export'}`}>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.name}>{header.name || 'Your Name'}</Text>
                    <View style={styles.contactInfo}>
                        {header.email && <Text>{header.email}</Text>}
                        {header.phone && <Text>{header.phone}</Text>}
                        {header.location && <Text>{header.location}</Text>}
                        {header.linkedin && <Text>{header.linkedin}</Text>}
                        {header.github && <Text>{header.github}</Text>}
                        {header.website && (
                            <Link src={`https://${header.website.replace(/^https?:\/\//, '')}`}>
                                <Text style={{ textDecoration: 'underline' }}>{header.website}</Text>
                            </Link>
                        )}
                    </View>
                </View>

                {/* Education */}
                {education.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Education</Text>
                        {education.map((edu, idx) => (
                            <View key={idx} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{edu.school || 'University'}</Text>
                                    <Text>{edu.year || ''}</Text>
                                </View>
                                <View style={styles.itemSubheader}>
                                    <Text>{edu.degree || ''}</Text>
                                    <Text>{edu.location || ''}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Experience */}
                {experiences.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Experience</Text>
                        {experiences.map((exp, idx) => (
                            <View key={idx} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{exp.company || 'Company'}</Text>
                                    <Text>{exp.duration || ''}</Text>
                                </View>
                                <View style={styles.itemSubheader}>
                                    <Text>{exp.role || ''}</Text>
                                    <Text>{exp.location || ''}</Text>
                                </View>
                                {exp.highlights && exp.highlights.length > 0 && (
                                    <View style={styles.bulletList}>
                                        {exp.highlights.map((h: string, i: number) => (
                                            <View key={i} style={styles.bulletPoint}>
                                                <Text style={styles.bullet}>•</Text>
                                                <Text style={styles.bulletText}>{h}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Projects</Text>
                        {projects.map((proj, idx) => (
                            <View key={idx} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text>{proj.title || 'Project'}</Text>
                                    <Text>{proj.duration || ''}</Text>
                                </View>
                                <View style={styles.itemSubheader}>
                                    <Text>{proj.technologies || ''}</Text>
                                </View>
                                {proj.highlights && proj.highlights.length > 0 && (
                                    <View style={styles.bulletList}>
                                        {proj.highlights.map((h: string, i: number) => (
                                            <View key={i} style={styles.bulletPoint}>
                                                <Text style={styles.bullet}>•</Text>
                                                <Text style={styles.bulletText}>{h}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Technical Skills</Text>
                        {skills.map((s, idx) => (
                            <View key={idx} style={{ marginBottom: 6, flexDirection: 'row' }}>
                                <Text style={{ fontWeight: 'bold', width: 90 }}>{s.category || 'Skills'}:</Text>
                                <Text style={{ flex: 1 }}>{s.skills || ''}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Page>
        </Document>
    );
};
