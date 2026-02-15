
import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Book,
    Shield,
    Mail,
    MessageCircle,
    HelpCircle,
    FileText,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Support = () => {
    const navigate = useNavigate();

    const faqs = [
        {
            question: "How do I reset or change my password?",
            answer: "You can change your password by navigating to your Profile page, clicking the hamburger menu icon (☰), and selecting 'Change Password'. If you've forgotten it, use the 'Forgot Password' link on the login screen and then you will recieve a reset mail."
        },
        {
            question: "How do I change my username?",
            answer: "Navigate to your Profile page, click the hamburger menu icon (☰), and select 'Change Username'."
        },
        {
            question: "How can I view and delete my confessions?",
            answer: "Go to your Profile page, click the hamburger menu icon (☰), and select 'My Confessions'. From there, you can view all your anonymous posts and delete them if you wish."
        },
        {
            question: "Is my identity anonymous in confessions?",
            answer: "Yes! Confessions are completely anonymous. We do not display your username or any personal information on confession posts. However, our admins can see the author for moderation purposes to prevent abuse."
        },
        {
            question: "Who can see my profile?",
            answer: "Your profile is visible to other registered students of CGU. We are a closed community exclusive to CGU Odisha students."
        },
        {
            question: "How do I report inappropriate content?",
            answer: "You can reach out to our support team via email if you find any content that violates our community guidelines."
        }
    ];

    const guidelines = [
        {
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
            title: "Be Respectful",
            description: "Treat all members with respect. Harassment, hate speech, and bullying are strictly prohibited."
        },
        {
            icon: <Shield className="h-5 w-5 text-blue-500" />,
            title: "Authentic Identity",
            description: "Use your real name and college email. Impersonation of others is not allowed."
        },
        {
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            title: "No NSFW Content",
            description: "Do not post nudity, sexual content, or graphic violence. Keep our community safe for everyone."
        },
        {
            icon: <MessageCircle className="h-5 w-5 text-purple-500" />,
            title: "Constructive Confessions",
            description: "Confessions are for sharing thoughts and feelings. Do not use them to spread rumors or attack individuals."
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0">
            <main className="container max-w-4xl mx-auto px-4 py-12 space-y-12">

                {/* Hero Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        How can we help you?
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Welcome to the CGU Connect Hub Support Center. Find answers, read guidelines, or get in touch with our team.
                    </p>
                </div>

                {/* Quick Links Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={() => document.getElementById('guidelines')?.scrollIntoView({ behavior: 'smooth' })}>
                        <CardHeader>
                            <Shield className="h-8 w-8 text-primary mb-2" />
                            <CardTitle>Community Rules</CardTitle>
                            <CardDescription>Learn what is allowed and what isn't</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={() => document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' })}>
                        <CardHeader>
                            <HelpCircle className="h-8 w-8 text-primary mb-2" />
                            <CardTitle>FAQs</CardTitle>
                            <CardDescription>Answers to common questions</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                        <CardHeader>
                            <Mail className="h-8 w-8 text-primary mb-2" />
                            <CardTitle>Contact Support</CardTitle>
                            <CardDescription>Get in touch with our team</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Community Guidelines */}
                <section id="guidelines" className="space-y-6 scroll-mt-24">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Community Guidelines</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {guidelines.map((item, index) => (
                            <div key={index} className="flex gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                                <div className="mt-1">{item.icon}</div>
                                <div>
                                    <h3 className="font-semibold mb-1">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQs */}
                <section id="faqs" className="space-y-6 scroll-mt-24">
                    <div className="flex items-center gap-2 mb-6">
                        <Book className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                {/* Contact */}
                <section id="contact" className="space-y-6 scroll-mt-24">
                    <div className="bg-primary/5 rounded-2xl p-8 text-center space-y-4 border border-primary/10">
                        <Mail className="h-12 w-12 text-primary mx-auto" />
                        <h2 className="text-2xl font-bold">Still need help?</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            If you couldn't find the answer you were looking for, our support team is here to help.
                        </p>
                        <Button size="lg" className="mt-4" onClick={() => window.location.href = 'mailto:cguconnect@gmail.com'}>
                            Email Support
                        </Button>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default Support;
